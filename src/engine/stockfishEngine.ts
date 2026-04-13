import type { StockfishScore } from '../types/stockfishDisplay'
import { ensureStockfishEngine } from './stockfishClient'

export interface AnalyzeResult {
  score: StockfishScore | null
  bestMoveUci: string | null
}

export async function analyzePosition(
  fen: string,
  depth = 14,
): Promise<AnalyzeResult> {
  const eng = await ensureStockfishEngine()
  const snap = await eng.analyze(fen, depth, 1, 600)
  const line = snap.lines.find((l) => l.multipv === 1) ?? snap.lines[0]
  const bestMoveUci = snap.bestMoveUci || line?.pvUci[0] || null
  let score: StockfishScore | null = null
  if (line?.score) {
    score =
      line.score.kind === 'cp'
        ? { type: 'cp', value: line.score.cp }
        : { type: 'mate', value: line.score.plies }
  }
  return { score, bestMoveUci }
}
