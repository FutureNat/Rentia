ALTER TABLE orders ADD COLUMN meli_post_sale_json TEXT;
ALTER TABLE orders ADD COLUMN meli_post_sale_checked_at TEXT;

CREATE TABLE order_item_cost_overrides (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  external_line_id TEXT NOT NULL,
  unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,provider,external_order_id,external_line_id),
  FOREIGN KEY(user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
