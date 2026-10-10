CREATE TABLE IF NOT EXISTS account_profiles (
  user_id TEXT PRIMARY KEY,
  phone_country TEXT,
  phone_number TEXT,
  phone_e164 TEXT,
  phone_verification_status TEXT NOT NULL DEFAULT 'not_started',
  phone_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_profiles_phone
  ON account_profiles(phone_e164);

PRAGMA optimize;
