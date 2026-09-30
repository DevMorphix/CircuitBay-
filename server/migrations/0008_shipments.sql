-- Courier integration (Shiprocket).
-- Booking a shipment from the admin stores the courier's ids; tracking
-- updates (webhook, or polling as a backstop) move the order forward
-- through shipped → out_for_delivery → delivered.

ALTER TABLE orders ADD COLUMN courier_provider TEXT;       -- 'shiprocket' | 'fake'; null = shipped by hand
ALTER TABLE orders ADD COLUMN courier_order_id TEXT;
ALTER TABLE orders ADD COLUMN shipment_id TEXT;
ALTER TABLE orders ADD COLUMN label_url TEXT;
ALTER TABLE orders ADD COLUMN tracking_url TEXT;
ALTER TABLE orders ADD COLUMN tracking_status TEXT;        -- courier's latest status text, e.g. 'IN TRANSIT'
ALTER TABLE orders ADD COLUMN tracking_checked_at INTEGER;
CREATE INDEX idx_orders_awb ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX idx_orders_tracking ON orders(courier_provider, status, tracking_checked_at) WHERE courier_provider IS NOT NULL;

-- Package weight for courier bookings (grams); the default is used when empty
ALTER TABLE products ADD COLUMN weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams > 0);

-- Short-lived API tokens for third-party services (e.g. Shiprocket's
-- 10-day login token), so every request doesn't log in again.
CREATE TABLE service_tokens (
  name        TEXT PRIMARY KEY,
  token       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);
