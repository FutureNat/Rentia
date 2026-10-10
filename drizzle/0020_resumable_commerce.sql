CREATE TABLE IF NOT EXISTS sync_jobs (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  state_json TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, provider),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user_date_id ON orders(user_id, source_created_at, id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id, id);
PRAGMA optimize;
