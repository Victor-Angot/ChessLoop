import { scoreToWhiteCp, whiteCpToBarPercent } from '../../engine/evalBar'
import type { StockfishScore } from '../../types/stockfishDisplay'

/** Chess.com-style vertical eval: light fill from the top (White advantage), dark below. */
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
  const percent = analyzing || !score ? 50 : whiteCpToBarPercent(whiteCp)

  return (
    <div
      className={`relative h-full min-h-0 w-14 shrink-0 overflow-hidden rounded-sm border border-black/50 bg-[#2a2a2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:w-16 ${className}`}
      role="img"
      aria-label="Evaluation bar: White toward the top, Black toward the bottom"
    >
      <div
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#f3f3f2] via-[#d6d6d4] to-[#9a9a96]"
        style={{ height: `${percent}%` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0.5 z-10 h-[3px] rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.5)]"
        style={{ top: `calc(${percent}% - 1.5px)` }}
      />
    </div>
  )
}
