-- CircuitBay schema v1 (Cloudflare D1 / SQLite).
-- Conventions: ids are TEXT (slugs or random ids), timestamps are unix
-- milliseconds (INTEGER), money is INTEGER paise, JSON columns are TEXT.

-- ---------------------------------------------------------------- users --
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE COLLATE NOCASE,
  phone           TEXT UNIQUE,              -- E.164, e.g. +919876543210
  password_hash   TEXT,                     -- null for phone-only accounts
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  email_verified  INTEGER NOT NULL DEFAULT 0,
  phone_verified  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Opaque session tokens; only the SHA-256 of the token is stored.
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  user_agent   TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- One-time codes / tokens: phone OTP, password reset, email verification.
CREATE TABLE verification_codes (
  id           TEXT PRIMARY KEY,
  purpose      TEXT NOT NULL CHECK (purpose IN ('phone_login', 'password_reset', 'email_verify')),
  target       TEXT NOT NULL,               -- phone number or email
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  expires_at   INTEGER NOT NULL,
  consumed_at  INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_codes_target ON verification_codes(purpose, target, created_at);

CREATE TABLE addresses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pin         TEXT NOT NULL,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- -------------------------------------------------------------- catalog --
CREATE TABLE categories (
  slug        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  icon        TEXT,
  blurb       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id             TEXT PRIMARY KEY,            -- slug
  name           TEXT NOT NULL,
  category       TEXT NOT NULL REFERENCES categories(slug),
  is_kit         INTEGER NOT NULL DEFAULT 0,
  level          TEXT CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  price_paise    INTEGER NOT NULL CHECK (price_paise >= 0),
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  brand          TEXT,
  type           TEXT,
  badges         TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  for_what       TEXT,
  build          TEXT,
  inside         TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  specs          TEXT NOT NULL DEFAULT '{}',  -- JSON object
  images         TEXT NOT NULL DEFAULT '[]',  -- JSON string[] of storage keys
  datasheet_key  TEXT,
  rating         REAL NOT NULL DEFAULT 0,
  reviews_count  INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_products_category ON products(category, active);

CREATE TABLE wishlist_items (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

-- --------------------------------------------------------------- orders --
CREATE TABLE orders (
  id                   TEXT PRIMARY KEY,      -- human-friendly, e.g. CB7K2M9QX4
  user_id              TEXT REFERENCES users(id) ON DELETE SET NULL,  -- null = guest
  status               TEXT NOT NULL CHECK (status IN (
                          'pending_payment', 'payment_failed', 'placed', 'confirmed', 'packed',
                          'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  contact_name         TEXT NOT NULL,
  contact_email        TEXT NOT NULL COLLATE NOCASE,
  contact_phone        TEXT NOT NULL,
  ship_line1           TEXT NOT NULL,
  ship_line2           TEXT,
  ship_city            TEXT NOT NULL,
  ship_state           TEXT NOT NULL,
  ship_pin             TEXT NOT NULL,
  shipping_method      TEXT NOT NULL CHECK (shipping_method IN ('standard', 'express')),
  subtotal_paise       INTEGER NOT NULL,
  shipping_paise       INTEGER NOT NULL,
  tax_paise            INTEGER NOT NULL,
  total_paise          INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'INR',
  payment_provider     TEXT NOT NULL,
  payment_order_id     TEXT UNIQUE,           -- Razorpay order_…
  payment_id           TEXT,                  -- Razorpay pay_…
  paid_at              INTEGER,
  courier              TEXT,
  tracking_number      TEXT,
  notes                TEXT,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);

CREATE TABLE order_items (
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        TEXT NOT NULL REFERENCES products(id),
  name              TEXT NOT NULL,            -- snapshot at purchase time
  unit_price_paise  INTEGER NOT NULL,
  qty               INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

-- Status timeline shown on the tracking page.
CREATE TABLE order_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_order_events_order ON order_events(order_id, created_at);

-- Raw payment webhook log (idempotency + audit).
CREATE TABLE payment_events (
  id          TEXT PRIMARY KEY,               -- provider event id
  provider    TEXT NOT NULL,
  type        TEXT NOT NULL,
  order_id    TEXT,
  payload     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

-- -------------------------------------------------------------- content --
CREATE TABLE articles (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  excerpt           TEXT,
  body              TEXT NOT NULL DEFAULT '[]', -- JSON blocks [{type,text,id?}]
  read_time         INTEGER,
  author            TEXT,
  cover_key         TEXT,
  featured          INTEGER NOT NULL DEFAULT 0,
  parts             TEXT NOT NULL DEFAULT '[]', -- JSON product ids
  related_projects  TEXT NOT NULL DEFAULT '[]', -- JSON project ids
  status            TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published_at      INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX idx_articles_pub ON articles(status, published_at);

-- Community projects: curated ones are 'published', submissions start 'pending'.
CREATE TABLE projects (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  blurb         TEXT,
  description   TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  builder       TEXT,
  builder_email TEXT,
  category      TEXT,
  image_key     TEXT,
  link          TEXT,
  featured      INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_projects_status ON projects(status, created_at);

-- ---------------------------------------------------------------- forms --
CREATE TABLE contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  created_at  INTEGER NOT NULL
);

CREATE TABLE workshop_requests (
  id              TEXT PRIMARY KEY,
  institution     TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  interest        TEXT,
  student_count   INTEGER,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'closed')),
  created_at      INTEGER NOT NULL
);

CREATE TABLE newsletter_subscribers (
  email              TEXT PRIMARY KEY COLLATE NOCASE,
  source             TEXT,
  status             TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  unsubscribe_token  TEXT NOT NULL UNIQUE,
  created_at         INTEGER NOT NULL
);

-- ----------------------------------------------------------------- misc --
CREATE TABLE uploads (
  key           TEXT PRIMARY KEY,
  content_type  TEXT NOT NULL,
  size          INTEGER NOT NULL,
  uploaded_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL
);

-- Fixed-window rate limiting shared across all instances.
CREATE TABLE rate_limits (
  key           TEXT PRIMARY KEY,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL
);
