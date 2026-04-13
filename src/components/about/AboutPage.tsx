import { aboutSections } from '../../content/aboutSections'

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">About Chess Loop</h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          How spaced repetition works in this app, written to stay easy to extend.
        </p>
      </header>

      <div className="space-y-10">
        {aboutSections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="card panel scroll-mt-24"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text)]">
              {section.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
