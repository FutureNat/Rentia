CREATE TABLE IF NOT EXISTS external_revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  revenue_date TEXT NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, revenue_date),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_revenue_user_date
ON external_revenue(user_id, revenue_date);

CREATE TABLE IF NOT EXISTS exchange_rate_settings (
  user_id TEXT PRIMARY KEY,
  rate_type TEXT NOT NULL DEFAULT 'official',
  base_rate REAL NOT NULL DEFAULT 0,
  adjustment_percent REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

PRAGMA optimize;
