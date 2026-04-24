import { ChevronLeft, ChevronRight, ChevronsRight, Microscope } from 'lucide-react'
import { useChessStore } from '../../stores/useChessStore'

export function TrainingFooterPanel() {
  const board = useChessStore((s) => s.board)
  const lines = useChessStore((s) => s.lines)
  const session = useChessStore((s) => s.session)
  const navPrev = useChessStore((s) => s.navPrev)
  const navNext = useChessStore((s) => s.navNext)
  const navToEnd = useChessStore((s) => s.navToEnd)
  const enterAnalysisMode = useChessStore((s) => s.enterAnalysisMode)

  const atLive = board.historyIndex === board.history.length - 1
  const line = lines.find((l) => l.id === session.currentLineId)
  const applied =
    board.history[board.historyIndex]?.lineMovesApplied ??
    session.plyIndex
  const lineLen = line?.moves.length

  return (
    <footer className="border-t border-[var(--border)] p-4">
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
          {lineLen != null ? ` · line ${applied}/${lineLen}` : ''}
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
    </footer>
  )
}
