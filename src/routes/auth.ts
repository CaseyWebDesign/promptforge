import { Hono } from 'hono';
import type { Env } from '../index';
import { generateId, generateApiKey, now } from '../lib/utils';

export const authRoutes = new Hono<{ Bindings: Env }>();

// Register — get a free API key
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email: string }>();
  if (!body.email || !body.email.includes('@')) {
    return c.json({ error: 'Valid email required' }, 400);
  }

  const email = body.email.toLowerCase().trim();

  // Check if already registered
  const existing = await c.env.DB.prepare(
    'SELECT api_key, plan FROM users WHERE email = ?'
  ).bind(email).first<{ api_key: string; plan: string }>();

  if (existing) {
    return c.json({
      api_key: existing.api_key,
      plan: existing.plan,
      message: 'Welcome back. Existing key returned.',
    });
  }

  const id = generateId();
  const apiKey = generateApiKey();

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, api_key, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, email, apiKey, 'free', now(), now()).run();

  return c.json({
    api_key: apiKey,
    plan: 'free',
    message: 'Account created. 3 free uses per day. Upgrade at /api/billing/checkout for unlimited.',
  }, 201);
});

// Check key status
authRoutes.get('/me', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'API key required in Authorization header' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT id, email, plan, uses_today, created_at FROM users WHERE api_key = ?'
  ).bind(key).first();

  if (!user) return c.json({ error: 'Invalid API key' }, 401);

  return c.json(user);
});
