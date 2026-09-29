-- Coupons.
-- A discount is taken off the item prices before GST (a discount shown on
-- the invoice reduces the taxable value), spread across the order lines in
-- proportion to their value. Uses are reserved at checkout like stock: the
-- `coupon_uses` CHECK makes a checkout that would go over `max_uses` fail
-- atomically, and cancelling an order gives the use back.

CREATE TABLE coupons (
  code                TEXT PRIMARY KEY COLLATE NOCASE,   -- e.g. WELCOME10
  description         TEXT,                               -- internal note
  kind                TEXT NOT NULL CHECK (kind IN ('percent', 'amount', 'free_shipping')),
  value               INTEGER NOT NULL DEFAULT 0,         -- percent: 1–100; amount: paise; free_shipping: 0
  max_discount_paise  INTEGER,                            -- cap for percent coupons
  min_subtotal_paise  INTEGER NOT NULL DEFAULT 0,
  starts_at           INTEGER,
  ends_at             INTEGER,
  max_uses            INTEGER,                            -- null = unlimited
  per_customer        INTEGER,                            -- uses per email; null = unlimited
  used_count          INTEGER NOT NULL DEFAULT 0,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  CONSTRAINT coupon_uses CHECK (max_uses IS NULL OR used_count <= max_uses),
  CHECK (kind != 'percent' OR (value BETWEEN 1 AND 100)),
  CHECK (kind != 'amount' OR value > 0)
);

ALTER TABLE orders ADD COLUMN coupon_code TEXT;
ALTER TABLE orders ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_orders_coupon ON orders(coupon_code, contact_email) WHERE coupon_code IS NOT NULL;

-- Each line's share of the discount (its taxable value = qty × price − this)
ALTER TABLE order_items ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0;

ALTER TABLE credit_notes ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0;
