import { useEffect, useMemo, useState } from 'react'
import { extractPgnCommentsForLine } from '../../engine/pgnParser'
import { useChessStore } from '../../stores/useChessStore'

const PGN_COMMENT_COLLAPSE_CHARS = 800

function truncateCommentForCollapse(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const sp = slice.lastIndexOf(' ')
  if (sp >= Math.floor(max * 0.55)) return slice.slice(0, sp).trimEnd()
  return slice.trimEnd()
}

function ExpandablePgnComment({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const needsToggle = text.length > PGN_COMMENT_COLLAPSE_CHARS

  useEffect(() => {
    setExpanded(false)
  }, [text])

  const display =
    !needsToggle || expanded
      ? text
      : `${truncateCommentForCollapse(text, PGN_COMMENT_COLLAPSE_CHARS)}…`

  return (
    <div className="space-y-1">
      <p className="muted break-words text-sm leading-relaxed whitespace-pre-wrap">{display}</p>
      {needsToggle ? (
        <button
          type="button"
          className="btn btn-ghost h-auto min-h-0 px-0 py-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

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

  useEffect(() => {
    setShowAllComments(false)
  }, [viewNextPly, session.currentLineId])

  /** `byPly[i]` is comments after `moves[i]`; `viewNextPly` is the index of the next move → last played is `viewNextPly - 1`. */
  const commentsForPly = useMemo(() => {
    if (viewNextPly <= 0) return commentsPre
    const afterLastPlayed = commentsByPly[viewNextPly - 1] ?? []
    if (afterLastPlayed.length) return afterLastPlayed
    const earlier = viewNextPly >= 2 ? (commentsByPly[viewNextPly - 2] ?? []) : []
    if (earlier.length) return earlier
    return commentsPre
  }, [commentsByPly, commentsPre, viewNextPly])

  const allComments = useMemo(() => {
    const flat = commentsByPly.flatMap((c) => c)
    return [...commentsPre, ...flat]
  }, [commentsByPly, commentsPre])

  const displayedComments = showAllComments ? allComments : commentsForPly
  const canShowAllToggle = allComments.length > commentsForPly.length

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
        {canShowAllToggle ? (
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
      {displayedComments.length === 0 && !showAllComments ? (
        <p className="muted text-sm leading-relaxed">No comment for this position.</p>
      ) : null}
      <div className="space-y-3">
        {displayedComments.map((c, idx) => (
          <ExpandablePgnComment
            key={`${line.id}-${viewNextPly}-${showAllComments}-${idx}-${c.length}`}
            text={c}
          />
        ))}
      </div>
    </aside>
  )
}
