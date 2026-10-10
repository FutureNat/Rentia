ALTER TABLE sync_status ADD COLUMN details_version INTEGER NOT NULL DEFAULT 0;

PRAGMA optimize;
