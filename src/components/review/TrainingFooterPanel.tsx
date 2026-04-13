import { ChevronLeft, ChevronRight, ChevronsRight, Microscope } from 'lucide-react'
import { useChessStore } from '../../stores/useChessStore'

export function TrainingFooterPanel({
  incorrectFromTo,
}: {
  incorrectFromTo: { from: string; to: string } | null
}) {
  const board = useChessStore((s) => s.board)
  const session = useChessStore((s) => s.session)
  const reviewMode = useChessStore((s) => s.reviewMode)
  const navPrev = useChessStore((s) => s.navPrev)
  const navNext = useChessStore((s) => s.navNext)
  const navToEnd = useChessStore((s) => s.navToEnd)
  const enterAnalysisMode = useChessStore((s) => s.enterAnalysisMode)
  const next = useChessStore((s) => s.next)
  const continueAfterMistake = useChessStore((s) => s.continueAfterMistake)

  const atLive = board.historyIndex === board.history.length - 1
  const overlay = session.overlay

  return (
    <footer className="space-y-3 border-t border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Previous ply"
          onClick={() => navPrev()}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Next ply"
          onClick={() => navNext()}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Jump to end"
          onClick={() => navToEnd()}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
        <span className="muted text-xs">
          Ply {board.historyIndex + 1}/{board.history.length}
          {!atLive ? ' · read-only' : ''}
        </span>
        <button
          type="button"
          className="btn btn-ghost ml-auto inline-flex items-center gap-1"
          onClick={() => enterAnalysisMode()}
        >
          <Microscope className="h-4 w-4" />
          Analysis
        </button>
      </div>

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

      {overlay?.type === 'incorrect' ? (
        <div className="subcard panel text-sm text-red-100">
          <p>
            Expected <strong>{overlay.expectedSAN}</strong>
            {incorrectFromTo
              ? ` (${incorrectFromTo.from}→${incorrectFromTo.to})`
              : ''}
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewMode === 'continue' && atLive ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => continueAfterMistake()}
              >
                Continue
              </button>
            ) : null}
            <button type="button" className="btn" onClick={() => void next()}>
              Next line
            </button>
          </div>
        </div>
      ) : null}
    </footer>
  )
}
