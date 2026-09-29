import { Card, Photo } from '../ui/Card.jsx'

// Community project card: photo, name, one-liner, component tags, builder.
export function ProjectCard({ project, large = false }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Photo src={project.image} label={`${project.title} — build photo`} className={`w-full ${large ? 'aspect-[16/10]' : 'aspect-[4/3]'}`} />
      <div className="flex flex-1 flex-col p-6">
        {project.category && <span className="chip self-start">{project.category}</span>}
        <h3 className={`mt-3 font-heading font-semibold text-ink-900 ${large ? 'text-2xl' : 'text-lg'}`}>
          {project.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{project.blurb}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Components used">
          {project.tags.map((t) => (
            <li key={t} className="rounded-md border border-black/10 px-2 py-0.5 text-[0.7rem] font-medium text-ink-600">
              {t}
            </li>
          ))}
        </ul>
        {project.builder && (
          <p className="mt-4 border-t border-black/5 pt-4 text-xs text-ink-400">
            Built by <span className="font-semibold text-ink-600">{project.builder}</span>
          </p>
        )}
      </div>
    </Card>
  )
}
