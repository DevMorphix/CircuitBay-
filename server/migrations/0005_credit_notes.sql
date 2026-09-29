-- GST credit notes (CGST Act s.34): issued when an order that already has a
-- tax invoice is cancelled. Full-value only, so at most one per order. The
-- amounts are copied from the order so the document never changes.
CREATE TABLE credit_notes (
  number          TEXT PRIMARY KEY,           -- e.g. CN/26-27/000001
  order_id        TEXT NOT NULL UNIQUE REFERENCES orders(id),
  invoice_no      TEXT NOT NULL,              -- the invoice it reverses
  reason          TEXT NOT NULL,
  subtotal_paise  INTEGER NOT NULL,
  shipping_paise  INTEGER NOT NULL,
  tax_paise       INTEGER NOT NULL,
  total_paise     INTEGER NOT NULL,
  issued_at       INTEGER NOT NULL
);

-- Separate running sequence per financial year
CREATE TABLE credit_note_counters (
  fy    TEXT PRIMARY KEY,
  last  INTEGER NOT NULL
);
