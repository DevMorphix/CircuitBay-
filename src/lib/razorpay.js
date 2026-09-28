// Loads Razorpay Standard Checkout on demand (only on the checkout page).
let loading

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve(window.Razorpay)
    s.onerror = () => {
      loading = undefined
      reject(new Error("Couldn't load the payment window. Check your connection and try again."))
    }
    document.head.appendChild(s)
  })
  return loading
}

// Opens the payment window for a server-created order. Resolves with the
// Razorpay response on success, rejects with { dismissed } or { failed }.
export async function payWithRazorpay(payment) {
  const Razorpay = await loadRazorpay()
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: payment.key,
      order_id: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: 'CircuitBay order',
      prefill: payment.prefill,
      theme: { color: '#3269c2' },
      handler: resolve,
      modal: { ondismiss: () => reject({ dismissed: true }) },
    })
    rzp.on('payment.failed', (r) => reject({ failed: true, reason: r?.error?.description }))
    rzp.open()
  })
}
