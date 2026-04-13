import type { StockfishPvLine } from '../types/stockfishDisplay'
import type { AnalysisSnapshot } from './stockfishEngineTypes'

export function snapshotToStockfishLines(snap: AnalysisSnapshot): StockfishPvLine[] {
  return snap.lines
    .filter((l) => l.score != null && l.pvUci.length > 0)
    .map((l) => {
      const sc = l.score!
      const score: StockfishPvLine['score'] =
        sc.kind === 'cp'
          ? { type: 'cp', value: sc.cp }
          : { type: 'mate', value: sc.plies }
      return {
        multipv: l.multipv,
        depth: l.depth,
        score,
        pv: l.pvUci,
      }
    })
}
