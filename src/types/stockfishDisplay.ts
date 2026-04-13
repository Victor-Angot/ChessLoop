export type StockfishScore =
  | { type: 'cp'; value: number }
  | { type: 'mate'; value: number }

/** Lines shown in the analysis panel (from a Stockfish MultiPV snapshot). */
export interface StockfishPvLine {
  multipv: number
  depth: number
  score: StockfishScore
  pv: string[]
}
