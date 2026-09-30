-- Product reviews from verified buyers.
-- Only a customer with a delivered order containing the product can review
-- it (one review per customer per product; editing sends it back for
-- approval). Reviews are shown after an admin approves them, and the
-- product's rating / reviews_count are recalculated from approved reviews.

CREATE TABLE reviews (
  id           TEXT PRIMARY KEY,
  product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id     TEXT NOT NULL REFERENCES orders(id),   -- the delivered order that qualifies it
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT NOT NULL,
  author_name  TEXT NOT NULL,                          -- shown publicly, e.g. "Priya S."
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reply        TEXT,                                   -- public reply from CircuitBay
  replied_at   INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  UNIQUE (user_id, product_id)
);
CREATE INDEX idx_reviews_product ON reviews(product_id, status, created_at);
CREATE INDEX idx_reviews_status ON reviews(status, created_at);
