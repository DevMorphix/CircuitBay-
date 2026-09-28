import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'

export function NotFound() {
  return (
    <PageShell seo={{ title: 'Page not found', path: '/404', noindex: true }}>
      <PageHero eyebrow="404" title="This trace goes nowhere." subtitle="The page you were looking for has moved or never existed.">
        <div className="mt-8 flex flex-wrap gap-4">
          <Button to="/">Back to the bay</Button>
          <Button to="/shop" variant="secondary-dark">
            Browse the shop
          </Button>
        </div>
      </PageHero>
    </PageShell>
  )
}
