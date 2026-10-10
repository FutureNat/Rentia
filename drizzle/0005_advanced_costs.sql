ALTER TABLE store_settings ADD COLUMN shipping_mode TEXT NOT NULL DEFAULT 'average';
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN source_shipping_cost REAL;

CREATE TABLE IF NOT EXISTS cost_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  match_value TEXT,
  calculation TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cost_rules_user_category ON cost_rules(user_id, category, enabled);

PRAGMA optimize;
