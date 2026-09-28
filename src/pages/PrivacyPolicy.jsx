import { LegalPage } from './LegalPage.jsx'

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" path="/privacy-policy">
      <p>
        This placeholder outlines the sections a finished policy needs. Replace with
        counsel-reviewed copy before launch.
      </p>
      <p>
        <strong>Information we collect:</strong> account details you provide, and basic
        analytics events (page views, CTA clicks) once you accept cookies.
      </p>
      <p>
        <strong>Cookies &amp; analytics:</strong> we use GA4 (or similar) only after you accept
        the cookie banner. See the Cookie Consent control in the site footer.
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
