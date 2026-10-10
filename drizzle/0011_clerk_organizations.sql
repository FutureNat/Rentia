CREATE TABLE IF NOT EXISTS store_identity_links (
  store_user_id TEXT PRIMARY KEY,
  clerk_organization_id TEXT NOT NULL UNIQUE,
  owner_clerk_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (store_user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_identity_owner
  ON store_identity_links(owner_clerk_user_id);

PRAGMA optimize;
