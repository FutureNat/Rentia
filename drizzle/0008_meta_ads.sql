CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  timezone_name TEXT,
  account_status INTEGER NOT NULL DEFAULT 0,
  selected INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, external_account_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_selected
ON meta_ad_accounts(user_id, selected);

CREATE TABLE IF NOT EXISTS meta_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  external_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  effective_status TEXT,
  daily_budget REAL NOT NULL DEFAULT 0,
  lifetime_budget REAL NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, external_campaign_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_user_account
ON meta_campaigns(user_id, external_account_id);

CREATE TABLE IF NOT EXISTS meta_insights_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  external_campaign_id TEXT NOT NULL,
  insight_date TEXT NOT NULL,
  spend REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  purchases REAL NOT NULL DEFAULT 0,
  purchase_value REAL NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, external_account_id, external_campaign_id, insight_date),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_user_date
ON meta_insights_daily(user_id, insight_date);

PRAGMA optimize;
