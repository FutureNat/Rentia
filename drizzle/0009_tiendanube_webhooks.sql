ALTER TABLE sync_status ADD COLUMN webhook_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE sync_status ADD COLUMN last_webhook_at TEXT;
ALTER TABLE sync_status ADD COLUMN webhooks_registered_at TEXT;
ALTER TABLE sync_status ADD COLUMN webhook_error TEXT;

PRAGMA optimize;
