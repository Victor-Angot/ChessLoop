import { useMemo } from 'react'
import { X } from 'lucide-react'
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
          <span className="label">Title filter</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm"
            value={filters.title ?? ''}
            placeholder="Contains…"
            onChange={(e) =>
              setFilters({ title: e.target.value || null })
            }
          />
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

      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.map((l) => (
          <li
            key={l.id}
            className="subcard flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm"
          >
            <div>
              <div className="font-semibold">{l.metadata.title}</div>
              {l.metadata.subtitle ? (
                <div className="muted text-xs">{l.metadata.subtitle}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
              <span className="capitalize">{l.metadata.color}</span>
              <span>{l.moves.length} plies</span>
              <span>{formatNextReview(l, clockNowMs)}</span>
            </div>
          </li>
        ))}
      </ul>
      </div>
    </section>
  )
}
