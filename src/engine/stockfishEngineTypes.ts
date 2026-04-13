/** Centipawns or mate (plies from side to move), UCI perspective. */
export type EngineScore =
  | { kind: 'cp'; cp: number }
  | { kind: 'mate'; plies: number }

export interface EngineLine {
  multipv: number
  depth: number
  score: EngineScore | null
  /** Full PV including first move. */
  pvUci: string[]
}

export interface AnalysisSnapshot {
  fen: string
  lines: EngineLine[]
  bestMoveUci: string
}

export interface IEngineAnalyzer {
  init(): Promise<void>
  /**
   * @param movetimeMs If set, UCI `go depth … movetime …` caps how long the search runs (ms).
   */
  analyze(
    fen: string,
    depth: number,
    multipv: number,
    movetimeMs?: number,
  ): Promise<AnalysisSnapshot>
  dispose(): void
}
