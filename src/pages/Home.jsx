import { useEffect } from 'react'
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

// Order after the reel (Part A): Who we are → Beliefs → Students →
// Educators → Projects → Blogs → Closing CTA → Footer.
export function Home() {
  // Section scroll-snap is a home-page-only behaviour
  useEffect(() => {
    document.documentElement.classList.add('home-snap')
    return () => document.documentElement.classList.remove('home-snap')
  }, [])

  return (
    <PageShell seo={{ path: '/', preloadImage: '/hero/frames/frame_001.webp', jsonLd: [schema.organization(), schema.website()] }}>
      <StoryReel />
      <WhoWeAre />
      <Beliefs />
      <ForStudents />
      <ForEducators />
      <FeaturedProjects />
      <FeaturedBlogs />
      <ClosingCta />
    </PageShell>
  )
}
