import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { templateRoutes } from './routes/templates';
import { authRoutes } from './routes/auth';
import { billingRoutes } from './routes/billing';
import { growthRoutes } from './routes/growth';
import { runSelfImprovement } from './routes/cron';

export type Env = {
  DB: D1Database;
  AI: Ai;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
  SITE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS for skill + landing page
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// Rate limiting via simple in-memory counter (resets on Worker restart)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const now = Date.now();
  const window = 60_000; // 1 minute
  const maxRequests = 60; // 60 req/min per IP

  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + window });
  } else if (entry.count >= maxRequests) {
    return c.json({ error: 'Rate limit exceeded. Try again in a minute.' }, 429);
  } else {
    entry.count++;
  }

  // Cleanup old entries periodically
  if (rateLimiter.size > 10000) {
    for (const [key, val] of rateLimiter) {
      if (now > val.resetAt) rateLimiter.delete(key);
    }
  }

  await next();
});

// Health check
app.get('/', (c) => c.json({
  name: 'PromptForge',
  version: '1.0.0',
  status: 'operational',
  docs: '/api/templates',
  signup: '/api/auth/register',
  templates: '/api/templates',
  categories: '/api/templates/categories',
}));

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/templates', templateRoutes);
app.route('/api/billing', billingRoutes);
app.route('/growth', growthRoutes);

// Stats endpoint (public — also used by landing page)
app.get('/api/stats', async (c) => {
  const db = c.env.DB;
  const [templates, users, usageLogs, improvements] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM templates').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM usage_logs').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM improvements').first<{ count: number }>(),
  ]);
  return c.json({
    templates: templates?.count ?? 0,
    users: users?.count ?? 0,
    totalUses: usageLogs?.count ?? 0,
    selfImprovements: improvements?.count ?? 0,
  });
});

// Admin: manually trigger self-improvement cycle
app.post('/api/admin/run-cycle', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'Auth required' }, 401);
  // Only the first registered user (admin) can trigger
  const admin = await c.env.DB.prepare(
    'SELECT api_key FROM users ORDER BY created_at ASC LIMIT 1'
  ).first<{ api_key: string }>();
  if (!admin || admin.api_key !== key) return c.json({ error: 'Admin only' }, 403);

  // Run cycle — await so cron and manual triggers both work
  try {
    await runSelfImprovement(c.env);
    const stats = await c.env.DB.prepare('SELECT COUNT(*) as c FROM templates').first<{c:number}>();
    return c.json({ status: 'Cycle complete', templates: stats?.c });
  } catch (err: any) {
    return c.json({ status: 'Cycle failed', error: err.message }, 500);
  }
});

// Sitemap for SEO (auto-generated from templates)
app.get('/sitemap.xml', async (c) => {
  const templates = await c.env.DB.prepare(
    'SELECT slug FROM templates ORDER BY usage_count DESC'
  ).all();

  const baseUrl = c.env.SITE_URL.replace('pages.dev', 'workers.dev');
  const urls = (templates.results as any[]).map(t =>
    `<url><loc>${baseUrl}/growth/preview/${t.slug}</loc><changefreq>weekly</changefreq></url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${c.env.SITE_URL}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${urls}
</urlset>`;

  return c.text(xml, 200, { 'Content-Type': 'application/xml' });
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err.message);
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not found', docs: '/api/templates' }, 404));

export default {
  fetch: app.fetch,

  // Cron triggers:
  // - "0 3 * * *" = full 7-phase autonomous cycle (daily 3am UTC)
  // - "0 */6 * * *" = lightweight optimization (every 6 hours)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const hour = new Date(event.scheduledTime).getUTCHours();
    // Full cycle at 3am, lightweight at other hours
    if (hour === 3) {
      ctx.waitUntil(runSelfImprovement(env));
    } else {
      // Lightweight: just check for easy wins (tier optimization, pruning)
      ctx.waitUntil(runSelfImprovement(env));
    }
  },
};
