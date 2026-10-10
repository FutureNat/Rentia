CREATE TABLE IF NOT EXISTS meli_billing_entries (
  user_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  period TEXT NOT NULL,
  billing_group TEXT NOT NULL,
  detail_id TEXT NOT NULL,
  generation TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT,
  order_ids TEXT NOT NULL,
  entry_json TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (user_id,seller_id,period,billing_group,detail_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meli_billing_period ON meli_billing_entries(user_id,seller_id,period,billing_group,generation);
