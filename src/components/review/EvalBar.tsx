import {
  formatEvalFromWhitePerspective,
  scoreToWhiteCp,
  whiteCpToBarPercent,
} from '../../engine/evalBar'
import type { StockfishScore } from '../../types/stockfishDisplay'

/** Vertical eval bar: White above, Black below; flat black/white fill. */
export function EvalBar({
  fen,
  score,
  analyzing,
  className = '',
}: {
  fen: string
  score: StockfishScore | null
  analyzing: boolean
  className?: string
}) {
  const whiteCp = scoreToWhiteCp(fen, score)
  const percent = analyzing && !score ? 50 : !score ? 50 : whiteCpToBarPercent(whiteCp)
  const label =
    analyzing && !score ? '…' : score ? formatEvalFromWhitePerspective(fen, score) : '—'
  const aria =
    analyzing && !score
      ? 'Evaluation: analyzing'
      : score
        ? `Evaluation from White’s perspective: ${label}. Bar: White toward the top.`
        : 'Evaluation bar: no score yet'

  return (
    <div
      className={`flex min-h-0 w-9 shrink-0 flex-col items-stretch gap-1 sm:w-10 ${className}`}
    >
      <div
        className="select-none text-center font-mono text-[10px] leading-none tabular-nums text-[var(--text)] sm:text-xs"
        aria-hidden
      >
        {label}
      </div>
      <div
        className="relative min-h-[100px] flex-1 overflow-hidden border border-[var(--text)] bg-black"
        role="img"
        aria-label={aria}
      >
        <div
          className="absolute inset-x-0 top-0 bg-white"
          style={{ height: `${percent}%` }}
        />
      </div>
    </div>
  )
}
