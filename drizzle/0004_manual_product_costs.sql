ALTER TABLE product_variants ADD COLUMN manual_cost REAL;
ALTER TABLE product_variants ADD COLUMN manual_cost_updated_at TEXT;

PRAGMA optimize;
