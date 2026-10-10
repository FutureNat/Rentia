ALTER TABLE store_settings ADD COLUMN tiendanube_plan_name TEXT;
ALTER TABLE store_settings ADD COLUMN pago_nube_payout_days INTEGER;
ALTER TABLE orders ADD COLUMN payment_type TEXT;
ALTER TABLE orders ADD COLUMN payment_installments INTEGER;
