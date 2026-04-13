import { useMemo } from 'react'
import { useChessStore } from '../stores/useChessStore'

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${m}-${day}`
}

function streakForLines(
  lines: import('../types/chess.types').ChessLine[],
  nowMs: number,
): number {
  const days = new Set<string>()
  for (const l of lines) {
    const lr = l.srs.lastReviewed
    if (!lr) continue
    days.add(ymdLocal(lr))
  }
  const today = new Date(nowMs)
  const cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  let streak = 0
  while (days.has(ymdLocal(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function StatsPanel() {
  const lines = useChessStore((s) => s.lines)
  const filters = useChessStore((s) => s.filters)
  const clockNowMs = useChessStore((s) => s.clockNowMs)
  const sessionIdle = useChessStore((s) => s.session.status === 'idle')

  const scoped = useMemo(() => {
    if (!filters.repertoireId) return lines
    return lines.filter((l) => l.repertoireId === filters.repertoireId)
  }, [lines, filters.repertoireId])

  const dueNow = useMemo(() => {
    return scoped.filter(
      (l) => l.srs.seen && l.srs.nextReview.getTime() <= clockNowMs,
    ).length
  }, [scoped, clockNowMs])

  const attempts = useMemo(
    () => scoped.reduce((a, l) => a + l.stats.attempts, 0),
    [scoped],
  )
  const successes = useMemo(
    () => scoped.reduce((a, l) => a + l.stats.successes, 0),
    [scoped],
  )
  const accuracy = attempts === 0 ? 0 : successes / attempts

  const streak = useMemo(
    () => streakForLines(scoped, clockNowMs),
    [scoped, clockNowMs],
  )

  const home = sessionIdle

  return (
    <aside
      className={`card panel ${home ? 'space-y-5 sm:space-y-6' : 'space-y-4'}`}
    >
      <h2
        className={
          home
            ? 'text-xs font-bold uppercase tracking-wide text-[var(--muted)] sm:text-sm'
            : 'text-sm font-bold uppercase tracking-wide text-[var(--muted)]'
        }
      >
        Stats
      </h2>
      <dl
        className={`grid grid-cols-2 ${home ? 'gap-3 sm:gap-4' : 'gap-3'} ${home ? 'text-sm sm:text-base' : 'text-sm'}`}
      >
        <div className={home ? 'subcard p-3 sm:p-4' : 'subcard p-3'}>
          <dt className="label">Lines</dt>
          <dd
            className={
              home
                ? 'mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl'
                : 'mt-1 text-xl font-semibold'
            }
          >
            {scoped.length}
          </dd>
        </div>
        <div className={home ? 'subcard p-3 sm:p-4' : 'subcard p-3'}>
          <dt className="label">Due now</dt>
          <dd
            className={
              home
                ? 'mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl'
                : 'mt-1 text-xl font-semibold'
            }
          >
            {dueNow}
          </dd>
        </div>
        <div className={home ? 'subcard p-3 sm:p-4' : 'subcard p-3'}>
          <dt className="label">Streak</dt>
          <dd
            className={
              home
                ? 'mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl'
                : 'mt-1 text-xl font-semibold'
            }
          >
            {streak}d
          </dd>
        </div>
        <div className={home ? 'subcard p-3 sm:p-4' : 'subcard p-3'}>
          <dt className="label">Accuracy</dt>
          <dd
            className={
              home
                ? 'mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl'
                : 'mt-1 text-xl font-semibold'
            }
          >
            {attempts === 0 ? '—' : `${Math.round(accuracy * 100)}%`}
          </dd>
        </div>
      </dl>
    </aside>
  )
}
