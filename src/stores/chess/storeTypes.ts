import type { Chess } from 'chess.js'
import type { ChessLine, Repertoire, ReviewQuality, TrainerColor } from '../../types/chess.types'
import type { StockfishPvLine } from '../../types/stockfishDisplay'

export type ReviewMode = 'hard_fail' | 'continue'

export type { StockfishScore, StockfishPvLine } from '../../types/stockfishDisplay'

/** Primary areas from the top navigation (independent surfaces). */
export type MainSection = 'trainer' | 'about'

export type LastOpponentMove = { from: string; to: string; san: string } | null

export interface BoardSnapshot {
  fen: string
  lastOpponentMove: LastOpponentMove
}

export type SessionOverlay =
  | null
  | { type: 'correct' }
  | { type: 'incorrect'; expectedSAN: string }
  | { type: 'skipped' }

export interface SessionState {
  queue: string[]
  currentLineId: string | null
  done: number
  total: number
  status: 'idle' | 'running' | 'answered'
  plyIndex: number
  userColor: TrainerColor
  attempt: {
    usedHint: boolean
    madeMistake: boolean
    correctUserPlies: number
  }
  overlay: SessionOverlay
}

export interface BoardState {
  chess: Chess
  fen: string
  hintSquares: { from: string; to: string } | null
  lastOpponentMove: LastOpponentMove
  history: BoardSnapshot[]
  historyIndex: number
}

export type AnalysisMultiPv = 1 | 2 | 3

/** UCI search depth bounds for analysis mode (inclusive). */
export const ANALYSIS_DEPTH_MIN = 6
export const ANALYSIS_DEPTH_MAX = 28
export const ANALYSIS_DEPTH_DEFAULT = 10

export interface AnalysisModeState {
  enabled: boolean
  chess: Chess
  fen: string
  history: { fen: string }[]
  historyIndex: number
  /** Depth last reported by the engine for the current lines. */
  depth: number
  lines: StockfishPvLine[]
  /** True while a depth search is in flight (Problems-style batch analyze). */
  analyzing: boolean
  /** Stockfish MultiPV count (1–3 engine lines). */
  multiPv: AnalysisMultiPv
  /** UCI `go depth` target (clamped to {@link ANALYSIS_DEPTH_MIN}–{@link ANALYSIS_DEPTH_MAX}). */
  targetDepth: number
}

export interface StoreState {
  lines: ChessLine[]
  repertoires: Repertoire[]
  clockNowMs: number
  reviewMode: ReviewMode
  ui: {
    showLinesPanel: boolean
    showImportPanel: boolean
    mainSection: MainSection
  }
  filters: {
    repertoireId: string | null
    title: string | null
    color: TrainerColor | null
  }
  session: SessionState
  board: BoardState
  analysisMode: AnalysisModeState
}

export function isUsersTurn(
  userColor: TrainerColor,
  plyIndex: number,
): boolean {
  return userColor === 'white' ? plyIndex % 2 === 0 : plyIndex % 2 === 1
}

export function computeQualitySuccess(attempt: SessionState['attempt']): ReviewQuality {
  if (attempt.madeMistake) return 3
  if (attempt.usedHint) return 4
  return 5
}

export function computeQualityMistake(
  correctUserPlies: number,
): ReviewQuality {
  return correctUserPlies === 0 ? 1 : 2
}
