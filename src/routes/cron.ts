import type { Env } from '../index';
import { generateId, slugify, now } from '../lib/utils';

// ============================================================
// AUTONOMOUS INTELLIGENCE ENGINE
// Runs daily at 3am UTC. Zero human input required.
//
// 7-PHASE CYCLE:
//   1. ANALYZE  — What's happening (usage, signups, conversions)
//   2. EXPAND   — Generate templates for high-demand + empty categories
//   3. IMPROVE  — Rewrite low-rated templates using feedback
//   4. OPTIMIZE — Promote top performers, adjust tier placement
//   5. PRUNE    — Remove dead weight (unused auto-generated after 30d)
//   6. DISCOVER — Invent new categories from user behavior patterns
//   7. LOG      — Record everything for analytics
// ============================================================

const KNOWN_CATEGORIES = [
  'sales', 'marketing', 'outreach', 'proposals', 'copywriting',
  'seo', 'social-media', 'email', 'business', 'freelance',
  'consulting', 'ecommerce', 'saas', 'real-estate', 'legal',
  'hr', 'finance', 'product', 'customer-success', 'content',
  'onboarding', 'retention', 'pricing', 'negotiation', 'branding',
  'analytics', 'hiring', 'investor-relations', 'partnerships', 'automation',
];

interface CycleReport {
  phase: string;
  action: string;
  details: Record<string, any>;
  templatesAdded: number;
  templatesRemoved: number;
  templatesImproved: number;
}

export async function runSelfImprovement(env: Env): Promise<void> {
  const db = env.DB;
  const timestamp = now();
  const reports: CycleReport[] = [];

  try {
    // ==================== PHASE 1: ANALYZE ====================
    const analysis = await analyzeSystem(env);
    reports.push({
      phase: 'analyze',
      action: 'system-analysis',
      details: analysis,
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: 0,
    });

    // ==================== PHASE 2: EXPAND ====================
    const expanded = await expandLibrary(env, analysis);
    reports.push({
      phase: 'expand',
      action: 'generate-templates',
      details: { categoriesFilled: expanded.categories },
      templatesAdded: expanded.added,
      templatesRemoved: 0,
      templatesImproved: 0,
    });

    // ==================== PHASE 3: IMPROVE ====================
    const improved = await improveTemplates(env);
    reports.push({
      phase: 'improve',
      action: 'rewrite-low-rated',
      details: { templatesRewritten: improved.rewritten, feedbackProcessed: improved.feedbackUsed },
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: improved.rewritten,
    });

    // ==================== PHASE 4: OPTIMIZE ====================
    const optimized = await optimizeTiers(env, analysis);
    reports.push({
      phase: 'optimize',
      action: 'tier-optimization',
      details: optimized,
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: optimized.promoted + optimized.demoted,
    });

    // ==================== PHASE 5: PRUNE ====================
    const pruned = await pruneDeadWeight(env, timestamp);
    reports.push({
      phase: 'prune',
      action: 'remove-unused',
      details: { removed: pruned },
      templatesAdded: 0,
      templatesRemoved: pruned,
      templatesImproved: 0,
    });

    // ==================== PHASE 6: DISCOVER ====================
    const discovered = await discoverNewCategories(env, analysis);
    reports.push({
      phase: 'discover',
      action: 'new-categories',
      details: { newCategories: discovered.categories, templatesGenerated: discovered.added },
      templatesAdded: discovered.added,
      templatesRemoved: 0,
      templatesImproved: 0,
    });

    // ==================== PHASE 7: LOG ====================
    const totalAdded = reports.reduce((s, r) => s + r.templatesAdded, 0);
    const totalRemoved = reports.reduce((s, r) => s + r.templatesRemoved, 0);
    const totalImproved = reports.reduce((s, r) => s + r.templatesImproved, 0);

    await db.prepare(
      'INSERT INTO improvements (id, action, details, templates_added, templates_removed, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      generateId(),
      'autonomous-cycle',
      JSON.stringify({
        cycle_timestamp: timestamp,
        analysis: analysis,
        phases: reports,
        totals: { added: totalAdded, removed: totalRemoved, improved: totalImproved },
      }),
      totalAdded,
      totalRemoved,
      timestamp,
    ).run();

  } catch (err: any) {
    // Never let the cron crash silently — log the failure
    await db.prepare(
      'INSERT INTO improvements (id, action, details, templates_added, templates_removed, created_at) VALUES (?, ?, ?, 0, 0, ?)'
    ).bind(
      generateId(),
      'cycle-error',
      JSON.stringify({ error: err.message || 'Unknown error', partialReports: reports }),
      timestamp,
    ).run();
  }
}

// ============================================================
// PHASE 1: ANALYZE — Understand the system state
// ============================================================
interface SystemAnalysis {
  totalTemplates: number;
  totalUsers: number;
  totalProUsers: number;
  usageLast7d: number;
  signupsLast7d: number;
  conversionRate: string;
  mrr: number;
  topCategories: { category: string; uses: number }[];
  starvedCategories: string[];
  emptyCategories: string[];
  avgRating: number;
  lowRatedCount: number;
  highPerformers: { slug: string; usage: number; rating: number }[];
}

async function analyzeSystem(env: Env): Promise<SystemAnalysis> {
  const db = env.DB;
  const weekAgo = now() - 7 * 86400000;

  const [
    templateCount, userCount, proCount, usageCount, signupCount,
    topCats, catStats, avgRating, lowRated, highPerformers,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM templates').first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'").first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) as c FROM usage_logs WHERE created_at > ?').bind(weekAgo).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at > ?').bind(weekAgo).first<{ c: number }>(),
    db.prepare(`
      SELECT category, COUNT(*) as uses FROM usage_logs
      WHERE created_at > ? GROUP BY category ORDER BY uses DESC LIMIT 10
    `).bind(weekAgo).all(),
    db.prepare(`
      SELECT category, COUNT(*) as count FROM templates GROUP BY category
    `).all(),
    db.prepare(`
      SELECT AVG(rating_sum * 1.0 / rating_count) as avg
      FROM templates WHERE rating_count > 0
    `).first<{ avg: number | null }>(),
    db.prepare(`
      SELECT COUNT(*) as c FROM templates
      WHERE rating_count >= 3 AND (rating_sum * 1.0 / rating_count) < 3.0
    `).first<{ c: number }>(),
    db.prepare(`
      SELECT slug, usage_count,
             CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE 0 END as rating
      FROM templates ORDER BY usage_count DESC LIMIT 5
    `).all(),
  ]);

  // Find categories with templates but low usage (starved of attention)
  const catMap = new Map<string, number>();
  for (const r of (catStats.results as any[])) catMap.set(r.category, r.count);

  const starved: string[] = [];
  const empty: string[] = [];
  for (const cat of KNOWN_CATEGORIES) {
    const count = catMap.get(cat);
    if (!count) empty.push(cat);
    else if (count < 5) starved.push(cat);
  }

  const totalUsers = userCount?.c ?? 0;
  const proUsers = proCount?.c ?? 0;

  return {
    totalTemplates: templateCount?.c ?? 0,
    totalUsers,
    totalProUsers: proUsers,
    usageLast7d: usageCount?.c ?? 0,
    signupsLast7d: signupCount?.c ?? 0,
    conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
    mrr: proUsers * 9,
    topCategories: (topCats.results as any[]).map(r => ({ category: r.category, uses: r.uses })),
    starvedCategories: starved,
    emptyCategories: empty,
    avgRating: avgRating?.avg ?? 0,
    lowRatedCount: lowRated?.c ?? 0,
    highPerformers: (highPerformers.results as any[]).map(r => ({
      slug: r.slug, usage: r.usage_count, rating: r.rating,
    })),
  };
}

// ============================================================
// PHASE 2: EXPAND — Fill gaps where demand exceeds supply
// ============================================================
async function expandLibrary(env: Env, analysis: SystemAnalysis): Promise<{ added: number; categories: string[] }> {
  const categoriesToFill: string[] = [];

  // Priority 1: High-demand categories with few templates
  for (const top of analysis.topCategories) {
    const existing = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM templates WHERE category = ?'
    ).bind(top.category).first<{ c: number }>();
    if ((existing?.c ?? 0) < 15) {
      categoriesToFill.push(top.category);
    }
  }

  // Priority 2: Starved categories (have some templates but not enough)
  for (const cat of analysis.starvedCategories) {
    if (!categoriesToFill.includes(cat)) categoriesToFill.push(cat);
  }

  // Priority 3: Empty known categories (backfill)
  for (const cat of analysis.emptyCategories.slice(0, 2)) {
    if (!categoriesToFill.includes(cat)) categoriesToFill.push(cat);
  }

  // Cap at 5 categories per cycle to stay within Workers AI limits
  const targets = categoriesToFill.slice(0, 5);
  let totalAdded = 0;

  for (const category of targets) {
    const added = await generateTemplatesForCategory(env, category);
    totalAdded += added;
  }

  return { added: totalAdded, categories: targets };
}

async function generateTemplatesForCategory(env: Env, category: string): Promise<number> {
  const db = env.DB;
  const ai = env.AI;

  const existing = await db.prepare(
    'SELECT name FROM templates WHERE category = ?'
  ).bind(category).all();
  const existingNames = (existing.results as any[]).map((r: any) => r.name);

  // Get top-rated templates from OTHER categories as quality examples
  const topExamples = await db.prepare(`
    SELECT name, description FROM templates
    WHERE rating_count > 0 AND (rating_sum * 1.0 / rating_count) >= 4.0
    ORDER BY usage_count DESC LIMIT 3
  `).all();
  const exampleText = (topExamples.results as any[])
    .map((r: any) => `"${r.name}" — ${r.description}`)
    .join('\n');

  const prompt = `You are a world-class prompt engineering expert specializing in business automation templates.

Generate exactly 5 high-quality prompt templates for the "${category}" category.

TARGET USER: Freelancers, agencies, and business owners using AI agents to automate work and make money.

EXISTING templates in this category (do NOT duplicate): ${existingNames.join(', ') || 'none yet'}

QUALITY BAR — match the style of these top-rated templates:
${exampleText || 'No rated examples yet — set a high bar.'}

For each template, output ONLY valid JSON — an array of objects:
- name: Short descriptive name (3-6 words)
- description: One sentence explaining what it does and who it helps (include the specific outcome)
- prompt: The full system prompt (300-600 words). MUST include:
  * A specific expert role definition
  * Clear INPUT requirements
  * Numbered step-by-step output structure
  * Specific formatting rules
  * Quality criteria and common mistakes to avoid
  * Word/length limits where appropriate
- tier: "free" for 2 of them, "pro" for 3 of them

The prompts must produce output so good that users would pay for them. Generic or vague prompts are worthless.

Output ONLY the JSON array. No markdown fences. No explanation.`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      prompt,
      max_tokens: 4000,
    });

    const text = (response as any).response;
    if (!text) return 0;

    let templates: any[];
    try {
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      // Handle cases where AI wraps in an object
      const parsed = JSON.parse(cleaned);
      templates = Array.isArray(parsed) ? parsed : parsed.templates || [];
    } catch {
      // Try to extract JSON array from messy output
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return 0;
      try {
        templates = JSON.parse(match[0]);
      } catch {
        return 0;
      }
    }

    if (!Array.isArray(templates)) return 0;

    let added = 0;
    for (const t of templates.slice(0, 5)) {
      if (!t.name || !t.description || !t.prompt) continue;
      if (t.prompt.length < 100) continue; // Reject low-effort prompts

      const slug = slugify(`${category}-${t.name}`);
      const exists = await db.prepare('SELECT 1 FROM templates WHERE slug = ?').bind(slug).first();
      if (exists) continue;

      await db.prepare(
        'INSERT INTO templates (id, slug, category, name, description, prompt, tier, auto_generated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
      ).bind(generateId(), slug, category, t.name, t.description, t.prompt, t.tier || 'free', now()).run();

      added++;
    }

    return added;
  } catch {
    return 0;
  }
}

// ============================================================
// PHASE 3: IMPROVE — Rewrite underperformers using feedback
// ============================================================
async function improveTemplates(env: Env): Promise<{ rewritten: number; feedbackUsed: number }> {
  const db = env.DB;
  const ai = env.AI;
  let rewritten = 0;
  let feedbackUsed = 0;

  // Strategy A: Fix low-rated templates
  const lowRated = await db.prepare(`
    SELECT id, slug, category, name, description, prompt, tier,
           rating_sum * 1.0 / rating_count as avg_rating
    FROM templates
    WHERE rating_count >= 3 AND (rating_sum * 1.0 / rating_count) < 3.0
    ORDER BY avg_rating ASC
    LIMIT 3
  `).all();

  for (const template of lowRated.results as any[]) {
    const feedbackRows = await db.prepare(
      'SELECT comment FROM feedback WHERE template_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 5'
    ).bind(template.id).all();

    const comments = (feedbackRows.results as any[]).map((r: any) => r.comment);
    feedbackUsed += comments.length;

    // Get a high-rated template from same category as quality reference
    const reference = await db.prepare(`
      SELECT prompt FROM templates
      WHERE category = ? AND rating_count > 0 AND (rating_sum * 1.0 / rating_count) >= 4.0
      ORDER BY usage_count DESC LIMIT 1
    `).bind(template.category).first<{ prompt: string }>();

    const prompt = `You are a prompt engineering expert. This template has low user ratings and needs to be rewritten.

CURRENT TEMPLATE:
Name: ${template.name}
Category: ${template.category}
Current Prompt: ${template.prompt}

USER COMPLAINTS:
${comments.join('\n') || 'No specific feedback — but the ratings are poor.'}

${reference ? `EXAMPLE OF A HIGH-RATED TEMPLATE IN THE SAME CATEGORY (match this quality):\n${reference.prompt.slice(0, 500)}` : ''}

Rewrite the prompt to be significantly better:
- More specific and actionable
- Better structured with clear sections
- Include concrete examples and frameworks
- Add quality criteria and common mistakes to avoid
- Professional tone, no fluff

Output ONLY the improved prompt text. Nothing else.`;

    try {
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as any, { prompt, max_tokens: 2000 });
      const improvedPrompt = (response as any).response;

      if (improvedPrompt && improvedPrompt.length > 150) {
        await db.prepare(
          'UPDATE templates SET prompt = ?, rating_sum = 0, rating_count = 0 WHERE id = ?'
        ).bind(improvedPrompt, template.id).run();
        rewritten++;
      }
    } catch {
      continue;
    }
  }

  // Strategy B: Improve highest-usage but never-rated templates (important but unvalidated)
  const unvalidated = await db.prepare(`
    SELECT id, slug, category, name, prompt
    FROM templates
    WHERE usage_count > 10 AND rating_count = 0
    ORDER BY usage_count DESC
    LIMIT 2
  `).all();

  for (const template of unvalidated.results as any[]) {
    const prompt = `You are a prompt engineering expert. This template is popular but has never been rated. Polish it to ensure quality matches its popularity.

CURRENT TEMPLATE:
Name: ${template.name}
Category: ${template.category}
Prompt: ${template.prompt}

Improve the prompt while keeping its core purpose. Make it:
- More structured and detailed
- More specific with concrete examples
- Better formatted with clear sections

Output ONLY the improved prompt text.`;

    try {
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as any, { prompt, max_tokens: 2000 });
      const improved = (response as any).response;

      if (improved && improved.length > 150) {
        await db.prepare('UPDATE templates SET prompt = ? WHERE id = ?').bind(improved, template.id).run();
        rewritten++;
      }
    } catch {
      continue;
    }
  }

  return { rewritten, feedbackUsed };
}

// ============================================================
// PHASE 4: OPTIMIZE — Smart tier management for revenue
// ============================================================
async function optimizeTiers(env: Env, analysis: SystemAnalysis): Promise<{ promoted: number; demoted: number }> {
  const db = env.DB;
  let promoted = 0;
  let demoted = 0;

  // Promote to pro: Free templates that are extremely popular (proven value = worth gating)
  // Only if we have enough free templates in the category to not scare users away
  const promotionCandidates = await db.prepare(`
    SELECT t.id, t.slug, t.category, t.usage_count,
           (SELECT COUNT(*) FROM templates t2 WHERE t2.category = t.category AND t2.tier = 'free') as free_count
    FROM templates t
    WHERE t.tier = 'free' AND t.usage_count > 20 AND t.auto_generated = 0
    ORDER BY t.usage_count DESC
    LIMIT 3
  `).all();

  for (const t of promotionCandidates.results as any[]) {
    // Only promote if category still has 2+ free templates after promotion
    if (t.free_count >= 3) {
      await db.prepare("UPDATE templates SET tier = 'pro' WHERE id = ?").bind(t.id).run();
      promoted++;
    }
  }

  // Demote to free: Pro templates with zero usage after 14 days (nobody's buying for them)
  const demotionCandidates = await db.prepare(`
    SELECT id FROM templates
    WHERE tier = 'pro' AND usage_count = 0 AND auto_generated = 1
      AND created_at < ?
  `).bind(now() - 14 * 86400000).all();

  for (const t of demotionCandidates.results as any[]) {
    await db.prepare("UPDATE templates SET tier = 'free' WHERE id = ?").bind((t as any).id).run();
    demoted++;
  }

  return { promoted, demoted };
}

// ============================================================
// PHASE 5: PRUNE — Remove dead weight
// ============================================================
async function pruneDeadWeight(env: Env, timestamp: number): Promise<number> {
  // Remove auto-generated templates with 0 usage after 30 days
  const result = await env.DB.prepare(`
    DELETE FROM templates
    WHERE auto_generated = 1
      AND usage_count = 0
      AND created_at < ?
  `).bind(timestamp - 30 * 86400000).run();

  return result.meta.changes || 0;
}

// ============================================================
// PHASE 6: DISCOVER — Invent new categories from behavior
// ============================================================
async function discoverNewCategories(env: Env, analysis: SystemAnalysis): Promise<{ categories: string[]; added: number }> {
  const ai = env.AI;

  // Only discover new categories if existing ones are well-stocked
  if (analysis.emptyCategories.length > 5) {
    return { categories: [], added: 0 }; // Fill known categories first
  }

  // Ask AI to suggest new categories based on what's popular
  const topCatNames = analysis.topCategories.map(c => c.category).join(', ');

  const prompt = `You are a market research analyst for a prompt template marketplace.

CURRENT popular categories: ${topCatNames}
ALL existing categories: ${KNOWN_CATEGORIES.join(', ')}

Based on current trends in AI automation, freelancing, and business in 2026, suggest exactly 3 NEW category names that:
1. Don't overlap with existing categories
2. Target professionals who will pay for templates
3. Are specific enough to be useful but broad enough to have 5+ templates

Output ONLY a JSON array of strings. Example: ["category-one", "category-two", "category-three"]
No explanation. Just the array.`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as any, { prompt, max_tokens: 200 });
    const text = (response as any).response;
    if (!text) return { categories: [], added: 0 };

    let newCats: string[];
    try {
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      newCats = JSON.parse(cleaned);
    } catch {
      return { categories: [], added: 0 };
    }

    if (!Array.isArray(newCats)) return { categories: [], added: 0 };

    // Validate and generate templates for each new category
    const validCats: string[] = [];
    let totalAdded = 0;

    for (const cat of newCats.slice(0, 2)) {
      const slug = slugify(cat);
      if (!slug || slug.length < 3 || KNOWN_CATEGORIES.includes(slug)) continue;

      // Check if category already has templates
      const exists = await env.DB.prepare(
        'SELECT COUNT(*) as c FROM templates WHERE category = ?'
      ).bind(slug).first<{ c: number }>();
      if ((exists?.c ?? 0) > 0) continue;

      const added = await generateTemplatesForCategory(env, slug);
      if (added > 0) {
        validCats.push(slug);
        totalAdded += added;
      }
    }

    return { categories: validCats, added: totalAdded };
  } catch {
    return { categories: [], added: 0 };
  }
}
