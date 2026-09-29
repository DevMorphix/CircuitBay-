-- GST tax invoices.
-- Products carry an HSN code and GST rate; order lines snapshot them (plus
-- the tax charged) so an invoice never changes after the fact. Orders get a
-- place of supply (GST state code of the delivery address) and a
-- sequential invoice number, issued when payment is confirmed.

ALTER TABLE products ADD COLUMN hsn_code TEXT;
ALTER TABLE products ADD COLUMN gst_rate INTEGER NOT NULL DEFAULT 18 CHECK (gst_rate IN (0, 5, 12, 18, 28));

ALTER TABLE order_items ADD COLUMN hsn_code TEXT;
ALTER TABLE order_items ADD COLUMN gst_rate INTEGER NOT NULL DEFAULT 18;
ALTER TABLE order_items ADD COLUMN tax_paise INTEGER;

ALTER TABLE orders ADD COLUMN place_of_supply TEXT; -- GST state code, e.g. '32'
ALTER TABLE orders ADD COLUMN invoice_no TEXT;
ALTER TABLE orders ADD COLUMN invoiced_at INTEGER;
CREATE UNIQUE INDEX idx_orders_invoice_no ON orders(invoice_no) WHERE invoice_no IS NOT NULL;

-- One running counter per financial year (April–March), e.g. '26-27'
CREATE TABLE invoice_counters (
  fy    TEXT PRIMARY KEY,
  last  INTEGER NOT NULL
);
