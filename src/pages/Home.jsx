import { PageShell } from '../components/layout/PageShell.jsx'
import { StoryReel } from '../components/sections/StoryReel.jsx'
import { WhoWeAre } from '../components/sections/home/WhoWeAre.jsx'
import { Beliefs } from '../components/sections/home/Beliefs.jsx'
import { ForStudents } from '../components/sections/home/ForStudents.jsx'
import { ForEducators } from '../components/sections/home/ForEducators.jsx'
import { FeaturedProjects } from '../components/sections/home/FeaturedProjects.jsx'
import { FeaturedBlogs } from '../components/sections/home/FeaturedBlogs.jsx'
import { ClosingCta } from '../components/sections/home/ClosingCta.jsx'
import { schema } from '../lib/seo.js'
import { useCheckpointScroll } from '../hooks/useCheckpointScroll.js'
import { ScrollRevealScope } from '../components/ui/Reveal.jsx'

// Order after the reel (Part A): Who we are → Beliefs → Students →
// Educators → Projects → Blogs → Closing CTA → Footer.
export function Home() {
  // A small scroll moves to the next checkpoint (reel chapters, sections)
  useCheckpointScroll()

  return (
    <PageShell seo={{ path: '/', preloadImage: '/hero/frames/frame_001.webp', jsonLd: [schema.organization(), schema.website()] }}>
      <StoryReel />
      {/* Every section's content animates with the scroll, both ways */}
      <ScrollRevealScope>
        <WhoWeAre />
        <Beliefs />
        <ForStudents />
        <ForEducators />
        <FeaturedProjects />
        <FeaturedBlogs />
        <ClosingCta />
      </ScrollRevealScope>
    </PageShell>
  )
}
