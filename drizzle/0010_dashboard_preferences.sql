CREATE TABLE IF NOT EXISTS dashboard_preferences (
  user_id TEXT PRIMARY KEY,
  layout_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

PRAGMA optimize;
