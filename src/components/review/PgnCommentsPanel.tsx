import { useMemo, useState } from 'react'
import { extractPgnCommentsForLine } from '../../engine/pgnParser'
import { useChessStore } from '../../stores/useChessStore'

/** Shown in the right column below Stats during practice (non-idle session). */
export function PgnCommentsPanel() {
  const session = useChessStore((s) => s.session)
  const board = useChessStore((s) => s.board)
  const lines = useChessStore((s) => s.lines)
  const [showAllComments, setShowAllComments] = useState(false)

  const line = useMemo(() => {
    if (session.status === 'idle') return undefined
    return lines.find((l) => l.id === session.currentLineId)
  }, [lines, session.currentLineId, session.status])

  const derivedComments = useMemo(() => {
    if (!line) return null
    if (line.comments) return line.comments
    if (!line.pgn || !line.moves?.length) return null
    const c = extractPgnCommentsForLine(line.pgn, line.moves.length)
    if (!c.pre.length && !c.byPly.some((x) => x.length)) return null
    return c
  }, [line])

  const commentsPre = derivedComments?.pre ?? []
  const commentsByPly = derivedComments?.byPly ?? []
  const viewNextPly =
    board.history[board.historyIndex]?.lineMovesApplied ?? session.plyIndex
  const commentsForPly = useMemo(() => {
    const current = commentsByPly[viewNextPly] ?? []
    const prev = commentsByPly[Math.max(0, viewNextPly - 1)] ?? []
    if (current.length) return current
    if (prev.length) return prev
    return commentsPre
  }, [commentsByPly, commentsPre, viewNextPly])

  const allComments = useMemo(() => {
    const flat = commentsByPly.flatMap((c) => c)
    return [...commentsPre, ...flat]
  }, [commentsByPly, commentsPre])

  const compactComments = useMemo(() => {
    if (commentsForPly.length > 0) return commentsForPly
    return allComments
  }, [allComments, commentsForPly])

  if (session.status === 'idle') return null

  if (!line) return null

  if (!allComments.length) {
    return (
      <aside className="card panel space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          PGN comments
        </h2>
        <p className="muted text-sm leading-relaxed">
          No comments found in the PGN for this line. Use PGN braces{' '}
          <code className="font-mono text-xs">{'{...}'}</code> or semicolon lines.
        </p>
      </aside>
    )
  }

  return (
    <aside className="card panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          PGN comments
        </h2>
        {allComments.length > compactComments.length ? (
          <button
            type="button"
            className="btn btn-ghost btn-icon text-[var(--muted)] hover:text-[var(--text)]"
            aria-label={showAllComments ? 'Show fewer comments' : 'Show all comments'}
            onClick={() => setShowAllComments((v) => !v)}
          >
            {showAllComments ? '−' : '+'}
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {(showAllComments ? allComments : compactComments).map((c, idx) => (
          <p key={idx} className="muted text-sm leading-relaxed">
            {c}
          </p>
        ))}
      </div>
    </aside>
  )
}
