ALTER TABLE orders ADD COLUMN meli_refund_adjustment_json TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS meli_ads_accounts (user_id TEXT NOT NULL,seller_id TEXT NOT NULL,advertiser_id TEXT NOT NULL,site_id TEXT NOT NULL,name TEXT NOT NULL,currency TEXT NOT NULL,selected INTEGER NOT NULL DEFAULT 0,last_completed_at TEXT,last_error TEXT,retry_at INTEGER NOT NULL DEFAULT 0,discovered_at TEXT NOT NULL,PRIMARY KEY(user_id,seller_id,advertiser_id),FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS meli_ads_daily (user_id TEXT NOT NULL,seller_id TEXT NOT NULL,advertiser_id TEXT NOT NULL,campaign_id TEXT NOT NULL,date TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,cost_cents INTEGER NOT NULL,attributed_cents INTEGER NOT NULL,clicks INTEGER NOT NULL,impressions INTEGER NOT NULL,units REAL NOT NULL,PRIMARY KEY(user_id,seller_id,advertiser_id,campaign_id,date),FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_meli_ads_date ON meli_ads_daily(user_id,seller_id,advertiser_id,date);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS meli_ads_stage (user_id TEXT NOT NULL,seller_id TEXT NOT NULL,advertiser_id TEXT NOT NULL,generation TEXT NOT NULL,campaign_id TEXT NOT NULL,date TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,cost_cents INTEGER NOT NULL,attributed_cents INTEGER NOT NULL,clicks INTEGER NOT NULL,impressions INTEGER NOT NULL,units REAL NOT NULL,PRIMARY KEY(user_id,seller_id,advertiser_id,generation,campaign_id,date),FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS meli_ads_coverage (user_id TEXT NOT NULL,seller_id TEXT NOT NULL,advertiser_id TEXT NOT NULL,date_from TEXT NOT NULL,date_to TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(user_id,seller_id,advertiser_id,date_from,date_to),FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE);
