CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',
  currency TEXT NOT NULL DEFAULT 'ARS',
  trial_started_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE TABLE IF NOT EXISTS store_settings (
  user_id TEXT PRIMARY KEY,
  primary_channel TEXT,
  shipping_cost_ars INTEGER NOT NULL DEFAULT 0,
  commission_percent REAL NOT NULL DEFAULT 0,
  tax_percent REAL NOT NULL DEFAULT 0,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_store_settings_channel ON store_settings(primary_channel);
PRAGMA optimize;
