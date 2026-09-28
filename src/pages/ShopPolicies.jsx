import { LegalPage } from './LegalPage.jsx'

// TODO_CLIENT: confirm return window, refund timelines, courier partners
// and shipping fees; replace with counsel-reviewed copy.
export function RefundPolicy() {
  return (
    <LegalPage title="Refund & Returns Policy" path="/refund-policy">
      <p>
        <strong>Returns:</strong> unused items in original packaging can be returned within the
        return window (TODO_CLIENT: days) of delivery.
      </p>
      <p>
        <strong>Damaged or faulty parts:</strong> tell us within 48 hours of delivery with a photo
        and we'll replace the item.
      </p>
      <p>
        <strong>Refunds:</strong> approved refunds go back to the original payment method within
        5–7 working days.
      </p>
    </LegalPage>
  )
}

export function ShippingPolicy() {
  return (
    <LegalPage title="Shipping Policy" path="/shipping-policy">
      <p>
        <strong>Coverage:</strong> we ship to serviceable pin codes across India.
      </p>
      <p>
        <strong>Timelines:</strong> orders are packed within 24 hours on working days and usually
        arrive within 3–7 working days.
      </p>
      <p>
        <strong>Fees:</strong> free shipping over ₹999; a flat fee applies below that
        (TODO_CLIENT: confirm).
      </p>
      <p>
        <strong>Tracking:</strong> every order is tracked — use the Track Order page with your
        order ID.
      </p>
    </LegalPage>
  )
}
