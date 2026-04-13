import { Chess } from 'chess.js'
import type { StockfishScore } from '../types/stockfishDisplay'

/** Centipawns from White’s perspective (positive = White better). */
export function scoreToWhiteCp(fen: string, score: StockfishScore | null): number {
  if (!score) return 0
  const stm = new Chess(fen).turn()
  if (score.type === 'mate') {
    const pl = score.value
    const mag = 10000 - Math.min(Math.abs(pl), 50) * 100
    const forSideToMove = pl > 0 ? mag : -mag
    return stm === 'w' ? forSideToMove : -forSideToMove
  }
  const cp = score.value
  return stm === 'w' ? cp : -cp
}

/** 0 = full Black, 50 = equal, 100 = full White (marker position from bottom). */
export function whiteCpToBarPercent(whiteCp: number): number {
  const t = Math.tanh(whiteCp / 380)
  return Math.min(100, Math.max(0, 50 + 50 * t))
}
