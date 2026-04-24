import { useMemo } from 'react'
import { Chess } from 'chess.js'
import { useChessStore } from '../../stores/useChessStore'

export function TrainingStatusMessage() {
  const session = useChessStore((s) => s.session)
  const board = useChessStore((s) => s.board)
  const lines = useChessStore((s) => s.lines)
  const next = useChessStore((s) => s.next)

  const line = lines.find((l) => l.id === session.currentLineId)

  const incorrectFromTo = useMemo(() => {
    if (session.overlay?.type !== 'incorrect') return null
    if (!line) return null
    const expected = session.overlay.expectedSAN
    try {
      const c = new Chess(board.fen)
      const m = c.move(expected, { strict: false })
      if (!m) return null
      return { from: m.from, to: m.to }
    } catch {
      return null
    }
  }, [session.overlay, line, board.fen])

  const remediation = session.remediation
  const overlay = session.overlay

  if (!remediation && !overlay) return null

  return (
    <div className="space-y-3">
      {remediation && session.status === 'running' ? (
        <p className="muted text-xs leading-relaxed">
          Replay {remediation.queue.length} missed move
          {remediation.queue.length === 1 ? '' : 's'} (same order as in your run).
        </p>
      ) : null}

      {overlay?.type === 'incorrect' ? (
        <div className="subcard panel text-sm text-red-100">
          <p className="font-semibold">Wrong move — try again.</p>
          <p className="muted mt-1 text-xs leading-relaxed">
            The correct move is shown on the board. Expected{' '}
            <strong className="text-red-50">{overlay.expectedSAN}</strong>
            {incorrectFromTo ? ` (${incorrectFromTo.from}→${incorrectFromTo.to})` : ''}.
          </p>
        </div>
      ) : null}

      {overlay?.type === 'correct' ? (
        <div className="subcard panel text-sm text-emerald-200">
          Line complete. Nice work.
          <div className="mt-3">
            <button type="button" className="btn btn-primary" onClick={() => void next()}>
              Next line
            </button>
          </div>
        </div>
      ) : null}

      {overlay?.type === 'skipped' ? (
        <div className="subcard panel text-sm text-amber-100">
          Skipped — spaced repetition updated.
          <div className="mt-3">
            <button type="button" className="btn btn-primary" onClick={() => void next()}>
              Next line
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

