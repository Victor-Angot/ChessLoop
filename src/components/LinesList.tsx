import { useMemo } from 'react'
import { X } from 'lucide-react'
import { groupLinesIntoSections, variationNumberInSection } from '../lib/lineSections'
import type { ChessLine } from '../types/chess.types'
import { useChessStore } from '../stores/useChessStore'

function formatNextReview(line: ChessLine, clockNowMs: number): string {
  if (!line.srs.seen) return 'new'
  if (line.srs.nextReview.getTime() <= clockNowMs) return 'due'
  return line.srs.nextReview.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function LinesList() {
  const lines = useChessStore((s) => s.lines)
  const repertoires = useChessStore((s) => s.repertoires)
  const filters = useChessStore((s) => s.filters)
  const clockNowMs = useChessStore((s) => s.clockNowMs)
  const setFilters = useChessStore((s) => s.setFilters)
  const removeRepertoire = useChessStore((s) => s.removeRepertoire)
  const setLinesPanelOpen = useChessStore((s) => s.setLinesPanelOpen)
  const startLineSession = useChessStore((s) => s.startLineSession)
  const setLineExcluded = useChessStore((s) => s.setLineExcluded)

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      if (filters.repertoireId && l.repertoireId !== filters.repertoireId) {
        return false
      }
      if (
        filters.title &&
        !l.metadata.title.toLowerCase().includes(filters.title.toLowerCase())
      ) {
        return false
      }
      if (filters.color && l.metadata.color !== filters.color) return false
      return true
    })
  }, [lines, filters])

  const librarySections = useMemo(
    () => groupLinesIntoSections(filtered),
    [filtered],
  )

  const titleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of lines) {
      if (filters.repertoireId && l.repertoireId !== filters.repertoireId) continue
      if (filters.color && l.metadata.color !== filters.color) continue
      set.add(l.metadata.title)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [lines, filters.repertoireId, filters.color])

  return (
    <section className="card flex max-h-[min(85vh,52rem)] flex-col overflow-hidden shadow-[var(--shadow-md)]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Library
        </h2>
        <button
          type="button"
          className="btn btn-icon btn-ghost text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Close library"
          onClick={() => setLinesPanelOpen(false)}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </header>
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 gap-3 sm:grid-cols-3">
        <label className="field">
          <span className="label">Repertoire</span>
          <select
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={filters.repertoireId ?? ''}
            onChange={(e) =>
              setFilters({
                repertoireId: e.target.value || null,
              })
            }
          >
            <option value="">All</option>
            {repertoires.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {filters.repertoireId ? (
          <div className="flex items-end">
            <button
              type="button"
              className="btn text-red-200"
              onClick={() => {
                if (
                  confirm(
                    'Delete this repertoire and all its lines? This cannot be undone.',
                  )
                ) {
                  void removeRepertoire(filters.repertoireId!)
                }
              }}
            >
              Delete repertoire
            </button>
          </div>
        ) : null}
        <label className="field sm:col-span-1">
          <span className="label">Opening filter</span>
          <select
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={filters.title ?? ''}
            onChange={(e) => setFilters({ title: e.target.value || null })}
          >
            <option value="">All titles</option>
            {titleOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Color</span>
          <select
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={filters.color ?? ''}
            onChange={(e) =>
              setFilters({
                color:
                  e.target.value === ''
                    ? null
                    : (e.target.value as 'white' | 'black'),
              })
            }
          >
            <option value="">Any</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {librarySections.map((section) => {
          const repName =
            repertoires.find((r) => r.id === section.repertoireId)?.name ?? 'Repertoire'
          return (
            <section key={section.key} className="space-y-2">
              <h3 className="border-b border-[var(--border)] pb-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                <span className="text-[var(--text)]">{section.title}</span>
                <span className="font-normal normal-case text-[var(--muted)]">
                  {' '}
                  · {repName}
                </span>
              </h3>
              <ul className="space-y-2">
                {section.lines.map((l) => {
                  const { index: varIndex, total: varTotal } = variationNumberInSection(
                    lines,
                    l,
                  )
                  return (
                    <li
                      key={l.id}
                      className="subcard flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setLinesPanelOpen(false)
                          void startLineSession(l.id)
                        }}
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="shrink-0 rounded border border-[var(--border)] bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:text-xs">
                            Var {varIndex}
                            {varTotal > 1 ? `/${varTotal}` : ''}
                          </span>
                          {l.metadata.subtitle ? (
                            <span className="font-semibold">{l.metadata.subtitle}</span>
                          ) : (
                            <span className="font-semibold text-[var(--muted)]">
                              Main line
                            </span>
                          )}
                        </div>
                        {l.excluded ? (
                          <div className="mt-1 text-xs font-semibold text-amber-100">
                            Excluded from learning
                          </div>
                        ) : null}
                      </button>
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                        <span className="capitalize">{l.metadata.color}</span>
                        <span>{l.moves.length} plies</span>
                        <span>{formatNextReview(l, clockNowMs)}</span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void setLineExcluded(l.id, !l.excluded)}
                        >
                          {l.excluded ? 'Include' : 'Exclude'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      </div>
    </section>
  )
}
