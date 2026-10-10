-- Serialize invitations across workers; no runtime schema creation.
CREATE TABLE IF NOT EXISTS team_admission_locks (
  user_id TEXT PRIMARY KEY,
  lock_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
