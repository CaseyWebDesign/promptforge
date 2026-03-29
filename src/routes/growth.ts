import { Hono } from 'hono';
import type { Env } from '../index';
import { generateId, now } from '../lib/utils';

export const growthRoutes = new Hono<{ Bindings: Env }>();

// Public shareable template preview (SEO + social sharing bait)
// Each template gets its own URL that can be shared, indexed, and drive signups
growthRoutes.get('/preview/:slug', async (c) => {
  const slug = c.req.param('slug');
  const template = await c.env.DB.prepare(
    'SELECT slug, category, name, description, tier, usage_count, rating_sum, rating_count FROM templates WHERE slug = ?'
  ).bind(slug).first<any>();

  if (!template) return c.text('Template not found', 404);

  const rating = template.rating_count > 0
    ? (template.rating_sum / template.rating_count).toFixed(1)
    : 'New';

  // Serve an HTML page that's SEO-optimized and shareable
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name} — PromptForge Template</title>
  <meta name="description" content="${template.description}">
  <meta property="og:title" content="${template.name} — Free AI Template">
  <meta property="og:description" content="${template.description}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${template.name} — PromptForge">
  <meta name="twitter:description" content="${template.description}">
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;max-width:600px;margin:40px auto;padding:0 20px;line-height:1.6}
    .badge{display:inline-block;background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.3);color:#f97316;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:600}
    .card{background:#141414;border:1px solid #262626;border-radius:12px;padding:24px;margin:20px 0}
    .stats{display:flex;gap:24px;margin:16px 0;font-size:14px;color:#a1a1aa}
    .btn{display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px}
    h1{font-size:24px;margin:16px 0 8px}
    .tier{text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 8px;border-radius:4px;background:${template.tier === 'pro' ? '#f97316' : '#22c55e'};color:#fff}
  </style>
</head>
<body>
  <div class="badge">PROMPTFORGE TEMPLATE</div>
  <h1>${template.name}</h1>
  <span class="tier">${template.tier}</span>
  <div class="card">
    <p>${template.description}</p>
    <div class="stats">
      <span>Category: ${template.category}</span>
      <span>Used ${template.usage_count} times</span>
      <span>Rating: ${rating}/5</span>
    </div>
  </div>
  <p style="color:#a1a1aa">Get this template and 50+ more with a free PromptForge API key.</p>
  <a href="https://promptforge.pages.dev" class="btn">Get Free API Key →</a>
  <p style="margin-top:32px;font-size:12px;color:#555">PromptForge — Self-improving AI template library for OpenClaw</p>
</body>
</html>`;

  return c.html(html);
});

// Generate shareable links for top templates (for social posting)
growthRoutes.get('/shareable', async (c) => {
  const templates = await c.env.DB.prepare(
    `SELECT slug, name, category, description, usage_count
     FROM templates
     WHERE tier = 'free'
     ORDER BY usage_count DESC
     LIMIT 10`
  ).all();

  const baseUrl = c.env.SITE_URL.replace('pages.dev', 'workers.dev');

  return c.json({
    shareable_links: (templates.results as any[]).map(t => ({
      name: t.name,
      category: t.category,
      preview_url: `${baseUrl}/growth/preview/${t.slug}`,
      tweet: `🔥 Free AI template: "${t.name}" — ${t.description}\n\nUsed ${t.usage_count} times. Get it free:\n${baseUrl}/growth/preview/${t.slug}\n\n#OpenClaw #AI #Automation`,
      linkedin: `I've been using this AI template for ${t.category} and it's been a game-changer.\n\n"${t.name}" — ${t.description}\n\nFree to use: ${baseUrl}/growth/preview/${t.slug}`,
    })),
  });
});

// Conversion analytics — what's working
growthRoutes.get('/analytics', async (c) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  // Simple admin check — first registered user is admin
  const admin = await c.env.DB.prepare(
    'SELECT id FROM users WHERE api_key = ? ORDER BY created_at ASC LIMIT 1'
  ).bind(key || '').first();

  if (!admin) return c.json({ error: 'Admin only' }, 403);

  const [signups, proUsers, usage7d, topTemplates, improvements] = await Promise.all([
    c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE created_at > ?'
    ).bind(now() - 7 * 86400000).first<{ count: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE plan = ?'
    ).bind('pro').first<{ count: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM usage_logs WHERE created_at > ?'
    ).bind(now() - 7 * 86400000).first<{ count: number }>(),
    c.env.DB.prepare(
      `SELECT slug, name, category, usage_count FROM templates ORDER BY usage_count DESC LIMIT 10`
    ).all(),
    c.env.DB.prepare(
      'SELECT * FROM improvements ORDER BY created_at DESC LIMIT 5'
    ).all(),
  ]);

  return c.json({
    last_7_days: {
      new_signups: signups?.count ?? 0,
      pro_subscribers: proUsers?.count ?? 0,
      template_uses: usage7d?.count ?? 0,
      conversion_rate: (signups?.count ?? 0) > 0
        ? ((proUsers?.count ?? 0) / (signups?.count ?? 1) * 100).toFixed(1) + '%'
        : '0%',
    },
    top_templates: topTemplates.results,
    recent_improvements: improvements.results,
    mrr: (proUsers?.count ?? 0) * 9,
  });
});
