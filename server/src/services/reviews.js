// Product reviews from verified buyers (see migrations/0007_reviews.sql).

// Orders that make `user` a verified buyer: linked to the account, or placed
// as a guest with the account's email once that email is confirmed.
const BUYER = `(o.user_id = ? OR (? = 1 AND o.contact_email = ?))`
const buyerParams = (user) => [user.id, user.email_verified ? 1 : 0, user.email ?? '']

// The most recent delivered order containing the product, or null
export async function qualifyingOrder(db, user, productId) {
  return db.first(
    `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.status = 'delivered' AND ${BUYER}
      ORDER BY o.created_at DESC LIMIT 1`,
    [productId, ...buyerParams(user)],
  )
}

// Delivered products the user hasn't reviewed yet
export async function reviewableProducts(db, user) {
  return db.all(
    `SELECT oi.product_id AS productId, oi.name, MAX(o.updated_at) AS deliveredAt
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = 'delivered' AND ${BUYER}
        AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = ? AND r.product_id = oi.product_id)
      GROUP BY oi.product_id
      ORDER BY deliveredAt DESC
      LIMIT 50`,
    [...buyerParams(user), user.id],
  )
}

// Recalculate a product's public rating from its approved reviews
export const recomputeRatingStatement = (productId) => ({
  sql: `UPDATE products SET
          rating = IFNULL((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = ? AND status = 'approved'), 0),
          reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND status = 'approved')
        WHERE id = ?`,
  params: [productId, productId, productId],
})

// Public name: "Priya Sharma" → "Priya S."; no name → "Verified buyer"
export function authorName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Verified buyer'
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.`
}

export const publicReview = (r) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  author: r.author_name,
  verified: true,
  createdAt: r.created_at,
  reply: r.reply ?? null,
  repliedAt: r.replied_at ?? null,
})
