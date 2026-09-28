import { featuredProjects, projects } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { Button } from '../../ui/Button.jsx'
import { ProjectCard } from '../../content/ProjectCard.jsx'

// A5 — light: 3-card grid of community projects.
export function FeaturedProjects() {
  return (
    <Section
      tone="light"
      id="projects"
      snap
      eyebrow={featuredProjects.eyebrow}
      title={featuredProjects.headline}
      headerAside={
        <div className="flex shrink-0 gap-3">
          <Button to={featuredProjects.ctaShare.to} variant="secondary">
            {featuredProjects.ctaShare.label}
          </Button>
          <Button to={featuredProjects.ctaAll.to}>{featuredProjects.ctaAll.label} →</Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {projects.slice(0, 3).map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
