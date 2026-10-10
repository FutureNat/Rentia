-- Naturae is the owner's connected development store. Its Pago Nube profile
-- was confirmed as Tiendanube Impulso with settlement in one day. Keeping this
-- as store-level configuration lets every order calculate automatically while
-- remaining editable from Rentia's settings.
UPDATE store_settings
SET pago_nube_plan_override = 'impulso',
    pago_nube_payout_days = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id IN (
  SELECT user_id
  FROM integrations
  WHERE provider = 'tiendanube'
    AND external_store_id = '6915018'
);
