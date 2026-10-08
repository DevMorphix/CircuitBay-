-- Track refunds so "refunds needed" clears once the money is returned.
-- A refund is issued in the Razorpay dashboard; the admin then marks the
-- order refunded here (POST /api/admin/orders/:id/refunded).
ALTER TABLE orders ADD COLUMN refunded_at INTEGER;
ALTER TABLE orders ADD COLUMN refund_note TEXT;
