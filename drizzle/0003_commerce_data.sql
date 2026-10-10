CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  source_created_at TEXT,
  source_updated_at TEXT,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, provider, external_product_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_products_user_provider ON products(user_id, provider);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_product_id TEXT NOT NULL,
  external_variant_id TEXT NOT NULL,
  sku TEXT,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock INTEGER,
  stock_management INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, provider, external_variant_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_variants_lookup ON product_variants(user_id, provider, external_variant_id);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  order_number TEXT,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  shipping_status TEXT,
  total REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  source_created_at TEXT NOT NULL,
  source_updated_at TEXT,
  synced_at TEXT NOT NULL,
  UNIQUE(user_id, provider, external_order_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_orders_user_provider_date ON orders(user_id, provider, source_created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_payment ON orders(user_id, payment_status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  external_line_id TEXT NOT NULL,
  external_product_id TEXT,
  external_variant_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  UNIQUE(user_id, provider, external_order_id, external_line_id),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(user_id, provider, external_order_id);

CREATE TABLE IF NOT EXISTS sync_status (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  last_started_at TEXT,
  last_completed_at TEXT,
  last_error TEXT,
  orders_synced INTEGER NOT NULL DEFAULT 0,
  products_synced INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, provider),
  FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
);

PRAGMA optimize;
