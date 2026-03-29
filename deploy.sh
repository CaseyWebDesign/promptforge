#!/bin/bash
set -e

echo "=========================================="
echo "  PromptForge — Deploy Script"
echo "=========================================="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js required. Install from https://nodejs.org"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "ERROR: npm/npx required."; exit 1; }

echo "[1/7] Installing dependencies..."
npm install

echo ""
echo "[2/7] Logging into Cloudflare..."
echo "  A browser window will open. Log in to your Cloudflare account."
echo "  (If you already logged in, this will skip.)"
npx wrangler whoami 2>/dev/null || npx wrangler login

echo ""
echo "[3/7] Creating D1 database..."
DB_OUTPUT=$(npx wrangler d1 create promptforge-db 2>&1) || true
echo "$DB_OUTPUT"

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+' || echo "")
if [ -z "$DB_ID" ]; then
  # Try alternate format
  DB_ID=$(echo "$DB_OUTPUT" | grep -oP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || echo "")
fi

if [ -n "$DB_ID" ]; then
  echo "  Database ID: $DB_ID"
  # Update wrangler.toml with actual database ID
  sed -i "s/REPLACE_AFTER_CREATION/$DB_ID/" wrangler.toml
  echo "  Updated wrangler.toml with database ID"
else
  echo "  WARNING: Could not extract database ID."
  echo "  If the database already exists, check: npx wrangler d1 list"
  echo "  Then manually update database_id in wrangler.toml"
fi

echo ""
echo "[4/7] Initializing database schema..."
npx wrangler d1 execute promptforge-db --remote --file=src/db/schema.sql

echo ""
echo "[5/7] Seeding templates..."
npx wrangler d1 execute promptforge-db --remote --file=src/db/seed.sql

echo ""
echo "[6/7] Deploying Worker..."
echo ""
echo "  IMPORTANT: You need to set these secrets before the worker is fully functional."
echo "  Run these commands after deploy:"
echo ""
echo "    npx wrangler secret put STRIPE_SECRET_KEY"
echo "    npx wrangler secret put STRIPE_WEBHOOK_SECRET"
echo ""
npx wrangler deploy

echo ""
echo "[7/7] Deploying landing page..."
npx wrangler pages project create promptforge --production-branch main 2>/dev/null || true
npx wrangler pages deploy landing/ --project-name promptforge

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "  Worker API: https://promptforge.<your-subdomain>.workers.dev"
echo "  Landing Page: https://promptforge.pages.dev"
echo ""
echo "  NEXT STEPS:"
echo "  1. Create Stripe product at https://dashboard.stripe.com/products"
echo "     - Name: 'PromptForge Pro'"
echo "     - Price: \$9/month recurring"
echo "     - Copy the Price ID (starts with price_)"
echo ""
echo "  2. Set secrets:"
echo "     npx wrangler secret put STRIPE_SECRET_KEY"
echo "     npx wrangler secret put STRIPE_WEBHOOK_SECRET"
echo ""
echo "  3. Update wrangler.toml:"
echo "     - Set STRIPE_PRICE_ID to your price ID"
echo "     - Set SITE_URL to your pages URL"
echo "     - Run: npx wrangler deploy"
echo ""
echo "  4. Set up Stripe webhook at https://dashboard.stripe.com/webhooks"
echo "     - URL: https://promptforge.<subdomain>.workers.dev/api/billing/webhook"
echo "     - Events: checkout.session.completed, customer.subscription.deleted,"
echo "              customer.subscription.updated, invoice.payment_failed, invoice.paid"
echo ""
echo "  5. Publish to ClawHub:"
echo "     npm install -g openclaw"
echo "     cd skill/"
echo "     clawhub publish promptforge"
echo ""
echo "  The self-improvement cron runs daily at 3am UTC automatically."
echo "=========================================="
