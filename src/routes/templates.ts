import { Hono } from 'hono';
import type { Env } from '../index';
import { generateId, now, startOfDay, FREE_DAILY_LIMIT, PAID_DAILY_LIMIT } from '../lib/utils';

export const templateRoutes = new Hono<{ Bindings: Env }>();

// List categories
templateRoutes.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT category, COUNT(*) as count FROM templates GROUP BY category ORDER BY count DESC'
  ).all();
  return c.json(rows.results);
});

// List templates (public — shows names/descriptions, not full prompts)
templateRoutes.get('/', async (c) => {
  const category = c.req.query('category');
  const tier = c.req.query('tier');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let sql = 'SELECT id, slug, category, name, description, tier, usage_count, rating_sum, rating_count FROM templates WHERE 1=1';
  const params: string[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (tier) {
    sql += ' AND tier = ?';
    params.push(tier);
  }

  sql += ' ORDER BY usage_count DESC LIMIT ? OFFSET ?';

  const stmt = c.env.DB.prepare(sql);
  const bound = params.length === 0
    ? stmt.bind(limit, offset)
    : params.length === 1
    ? stmt.bind(params[0], limit, offset)
    : stmt.bind(params[0], params[1], limit, offset);

  const rows = await bound.all();

  return c.json({
    templates: rows.results.map((r: any) => ({
      ...r,
      rating: r.rating_count > 0 ? (r.rating_sum / r.rating_count).toFixed(1) : null,
    })),
    count: rows.results.length,
  });
});

// Get a template (requires auth, enforces rate limits)
templateRoutes.get('/:slug', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'API key required. Get one free at /api/auth/register' }, 401);

  const slug = c.req.param('slug');

  // Get user
  const user = await c.env.DB.prepare(
    'SELECT id, plan, uses_today, uses_reset_at FROM users WHERE api_key = ?'
  ).bind(key).first<{ id: string; plan: string; uses_today: number; uses_reset_at: number }>();

  if (!user) return c.json({ error: 'Invalid API key' }, 401);

  // Reset daily counter if needed
  const todayStart = startOfDay();
  let usesToday = user.uses_today;
  if (user.uses_reset_at < todayStart) {
    usesToday = 0;
    await c.env.DB.prepare(
      'UPDATE users SET uses_today = 0, uses_reset_at = ? WHERE id = ?'
    ).bind(todayStart, user.id).run();
  }

  // Check limits
  const limit = user.plan === 'free' ? FREE_DAILY_LIMIT : PAID_DAILY_LIMIT;
  if (usesToday >= limit) {
    return c.json({
      error: 'Daily limit reached',
      limit,
      plan: user.plan,
      upgrade: user.plan === 'free' ? '/api/billing/checkout' : null,
    }, 429);
  }

  // Get template
  const template = await c.env.DB.prepare(
    'SELECT * FROM templates WHERE slug = ?'
  ).bind(slug).first();

  if (!template) return c.json({ error: 'Template not found' }, 404);

  // Check tier access
  if ((template as any).tier === 'pro' && user.plan === 'free') {
    return c.json({
      error: 'Pro template — upgrade to access',
      template: { name: (template as any).name, description: (template as any).description, tier: 'pro' },
      upgrade: '/api/billing/checkout',
    }, 403);
  }

  // Log usage + increment counters
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO usage_logs (id, user_id, template_id, category, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), user.id, (template as any).id, (template as any).category, now()),
    c.env.DB.prepare(
      'UPDATE users SET uses_today = uses_today + 1, updated_at = ? WHERE id = ?'
    ).bind(now(), user.id),
    c.env.DB.prepare(
      'UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?'
    ).bind((template as any).id),
  ]);

  return c.json({
    template: {
      slug: (template as any).slug,
      name: (template as any).name,
      category: (template as any).category,
      description: (template as any).description,
      prompt: (template as any).prompt,
    },
    uses_remaining: limit - usesToday - 1,
    plan: user.plan,
  });
});

// Rate a template
templateRoutes.post('/:slug/rate', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key) return c.json({ error: 'API key required' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE api_key = ?'
  ).bind(key).first<{ id: string }>();
  if (!user) return c.json({ error: 'Invalid API key' }, 401);

  const slug = c.req.param('slug');
  const body = await c.req.json<{ rating: number; comment?: string }>();

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return c.json({ error: 'Rating must be 1-5' }, 400);
  }

  const template = await c.env.DB.prepare(
    'SELECT id FROM templates WHERE slug = ?'
  ).bind(slug).first<{ id: string }>();
  if (!template) return c.json({ error: 'Template not found' }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO feedback (id, user_id, template_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), user.id, template.id, body.rating, body.comment || null, now()),
    c.env.DB.prepare(
      'UPDATE templates SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?'
    ).bind(body.rating, template.id),
  ]);

  return c.json({ success: true });
});
