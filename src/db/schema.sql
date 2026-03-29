-- PromptForge D1 Schema
-- Self-operating prompt template SaaS

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  uses_today INTEGER NOT NULL DEFAULT 0,
  uses_reset_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  auto_generated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

CREATE TABLE IF NOT EXISTS improvements (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  templates_added INTEGER NOT NULL DEFAULT 0,
  templates_removed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tier ON templates(tier);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_category ON usage_logs(category);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
