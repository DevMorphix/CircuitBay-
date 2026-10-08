import { LegalPage } from './LegalPage.jsx'

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" path="/privacy-policy">
      <p>
        This placeholder outlines the sections a finished policy needs. Replace with
        counsel-reviewed copy before launch.
      </p>
      <p>
        <strong>Information we collect:</strong> account details you provide (name, email,
        mobile number, saved addresses), your orders, and messages you send through our forms.
        Payments are handled by Razorpay — we never see or store card details.
      </p>
      <p>
        <strong>Service providers:</strong> we use Razorpay (payments), Cloudflare (hosting and
        storage), an email provider (order and account emails), an SMS provider (sign-in
        codes) and a shipping partner (Shiprocket and its courier companies), who receive your
        name, delivery address, phone number and email to deliver your order. TODO_CLIENT: confirm the final list.
      </p>
      <p>
        <strong>Cookies &amp; analytics:</strong> a session cookie keeps you signed in. We use
        Google Analytics only after you accept the cookie banner, to understand how the site is
        used (pages viewed, products viewed, items added to the cart, purchases).
      </p>
      <p>
        <strong>Reviews:</strong> if you review a product, we publish your rating and review
        with your first name and last initial (for example &ldquo;Priya S.&rdquo;) and a
        &ldquo;Verified buyer&rdquo; label. You can edit or delete it from My account.
      </p>
      <p>
        <strong>Error monitoring:</strong> when something breaks, technical details about the
        error (such as the page and browser) are sent to Sentry so we can fix it. We don&rsquo;t
        send your name, email, payment details or the contents of forms.
      </p>
      <p>
        <strong>Third-party links:</strong> Shop and Community links may point to
        shop.circuitbay.in and community.circuitbay.in, which may have their own policies.
      </p>
      <p>
        <strong>Contact:</strong> TODO_CLIENT — insert a real contact/DPO email address.
      </p>
    </LegalPage>
  )
}
