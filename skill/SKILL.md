---
name: promptforge
description: Access 50+ expert-crafted prompt templates for sales, outreach, proposals, marketing, and business. Self-improving library grows daily. Free tier included.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - curl
    primaryEnv: PROMPTFORGE_API_KEY
    emoji: "🔥"
    homepage: https://promptforge.pages.dev
    tags:
      - sales
      - marketing
      - outreach
      - proposals
      - copywriting
      - freelance
      - business
      - productivity
      - templates
      - automation
---

# PromptForge — Expert Prompt Templates That Make You Money

PromptForge gives your OpenClaw agent access to a self-improving library of battle-tested prompt templates for sales, outreach, proposals, marketing, copywriting, and business operations.

**The library grows itself.** Every day, an AI analyzes what templates get used most and generates new ones for high-demand categories. Low-rated templates get automatically rewritten. The system gets better while you sleep.

## Quick Start

1. Get your free API key: `curl -X POST https://promptforge.caseycoco33.workers.dev/api/auth/register -H "Content-Type: application/json" -d '{"email":"you@example.com"}'`
2. Set your key: Export `PROMPTFORGE_API_KEY` in your environment
3. Ask your agent: "Use PromptForge to write a cold email for [prospect]"

## What You Can Do

- **Browse templates**: "Show me all PromptForge templates in the sales category"
- **Use a template**: "Use the PromptForge cold email template for [details]"
- **Rate templates**: "Rate the proposal template 5 stars"
- **Discover**: "What PromptForge templates are most popular?"

## Categories

- **Sales** — Discovery calls, objection handling, pricing, follow-ups
- **Outreach** — Cold email, LinkedIn, partnerships, warm intros
- **Proposals** — Scopes of work, case studies, ROI projections, timelines
- **Copywriting** — Landing pages, ad copy, launch sequences, testimonials
- **Marketing** — Content calendars, competitor analysis, lead magnets, brand voice
- **SEO** — Blog briefs, local SEO, topic clusters
- **Freelance** — Rate setting, onboarding, Upwork profiles, niche selection
- **Business** — Reports, meeting notes, invoices
- **Email** — Newsletters, difficult conversations, re-engagement
- **Social Media** — Content repurposing, LinkedIn posts, short video scripts
- *...and growing daily via self-improvement engine*

## How It Works

When you ask to "use a PromptForge template," I will:

1. Fetch the expert-crafted prompt template from the PromptForge API
2. Fill in your specific details (client name, industry, context)
3. Run the template through my AI to generate professional output
4. Deliver polished, ready-to-use content

The templates aren't simple prompts — they're detailed frameworks built by experts with specific structures, psychological principles, and quality criteria that produce dramatically better output than ad-hoc requests.

## API Usage

All API calls use your `PROMPTFORGE_API_KEY` in the Authorization header.

### List templates
```bash
curl https://promptforge.caseycoco33.workers.dev/api/templates \
  -H "Authorization: Bearer $PROMPTFORGE_API_KEY"
```

### Get a specific template
```bash
curl https://promptforge.caseycoco33.workers.dev/api/templates/sales-discovery-call-prep \
  -H "Authorization: Bearer $PROMPTFORGE_API_KEY"
```

### List categories
```bash
curl https://promptforge.caseycoco33.workers.dev/api/templates/categories
```

### Rate a template
```bash
curl -X POST https://promptforge.caseycoco33.workers.dev/api/templates/sales-discovery-call-prep/rate \
  -H "Authorization: Bearer $PROMPTFORGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "This template is incredible"}'
```

## Plans

| | Free | Pro ($9/mo) |
|---|---|---|
| Templates per day | 3 | 1,000 |
| Free templates | ✓ | ✓ |
| Pro templates | ✗ | ✓ |
| New templates daily | ✓ | ✓ |
| Rate & improve | ✓ | ✓ |

Upgrade at: `https://promptforge.pages.dev`

## System Instructions

When the user asks you to use PromptForge, follow this process:

1. If no API key is set, tell the user to register at the /api/auth/register endpoint
2. Browse available templates using the /api/templates endpoint
3. Fetch the specific template using /api/templates/{slug}
4. The template response contains a `prompt` field — this is the expert system prompt
5. Use that prompt as your instructions, filling in the user's specific details
6. Generate the output following the template's structure exactly
7. After the user reviews the output, ask if they'd like to rate the template

Always tell the user which template you're using and what category it's from.
