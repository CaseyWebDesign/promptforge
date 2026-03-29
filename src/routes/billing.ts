import { Hono } from 'hono';
import type { Env } from '../index';
import { now } from '../lib/utils';
import { verifyStripeSignature } from '../lib/stripe';

export const billingRoutes = new Hono<{ Bindings: Env }>();

// Create Stripe checkout session (authenticated)
billingRoutes.post('/checkout', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'API key required' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT id, email, plan, stripe_customer_id FROM users WHERE api_key = ?'
  ).bind(key).first<{ id: string; email: string; plan: string; stripe_customer_id: string | null }>();

  if (!user) return c.json({ error: 'Invalid API key' }, 401);
  if (user.plan === 'pro') return c.json({ message: 'Already on Pro plan' });

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', c.env.STRIPE_PRICE_ID);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${c.env.SITE_URL}?upgraded=true`);
  params.set('cancel_url', `${c.env.SITE_URL}?cancelled=true`);
  params.set('customer_email', user.email);
  params.set('client_reference_id', user.id);
  params.set('metadata[user_id]', user.id);
  params.set('metadata[api_key]', key);

  if (user.stripe_customer_id) {
    params.delete('customer_email');
    params.set('customer', user.stripe_customer_id);
  }

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(c.env.STRIPE_SECRET_KEY + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session: any = await resp.json();
  if (!resp.ok) return c.json({ error: 'Payment system error' }, 500);

  return c.json({ checkout_url: session.url });
});

// Create Stripe Customer Portal session (for managing subscriptions)
billingRoutes.post('/portal', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'API key required' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM users WHERE api_key = ?'
  ).bind(key).first<{ stripe_customer_id: string | null }>();

  if (!user?.stripe_customer_id) return c.json({ error: 'No billing account found' }, 404);

  const params = new URLSearchParams();
  params.set('customer', user.stripe_customer_id);
  params.set('return_url', c.env.SITE_URL);

  const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(c.env.STRIPE_SECRET_KEY + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session: any = await resp.json();
  if (!resp.ok) return c.json({ error: 'Portal error' }, 500);

  return c.json({ portal_url: session.url });
});

// Stripe webhook — cryptographically verified
billingRoutes.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  const rawBody = await c.req.text();

  // Cryptographic signature verification
  const valid = await verifyStripeSignature(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return c.json({ error: 'Invalid signature' }, 401);

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id || session.client_reference_id;
      if (userId) {
        await c.env.DB.prepare(
          'UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE id = ?'
        ).bind('pro', session.customer, session.subscription, now(), userId).run();
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const status = sub.status;
      // Handle subscription going active after trial, or reactivation
      if (status === 'active') {
        await c.env.DB.prepare(
          'UPDATE users SET plan = ?, updated_at = ? WHERE stripe_subscription_id = ?'
        ).bind('pro', now(), sub.id).run();
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await c.env.DB.prepare(
        'UPDATE users SET plan = ?, stripe_subscription_id = NULL, updated_at = ? WHERE stripe_subscription_id = ?'
      ).bind('free', now(), sub.id).run();
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      // Downgrade on payment failure
      await c.env.DB.prepare(
        'UPDATE users SET plan = ?, updated_at = ? WHERE stripe_customer_id = ?'
      ).bind('free', now(), invoice.customer).run();
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      // Re-upgrade on successful payment (handles retries)
      if (invoice.subscription) {
        await c.env.DB.prepare(
          'UPDATE users SET plan = ?, updated_at = ? WHERE stripe_customer_id = ?'
        ).bind('pro', now(), invoice.customer).run();
      }
      break;
    }
  }

  return c.json({ received: true });
});
