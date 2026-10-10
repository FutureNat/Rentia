-- Local catalog visibility only. Provider publication and historical sales stay intact.
ALTER TABLE products ADD COLUMN rentia_archived INTEGER NOT NULL DEFAULT 0;
