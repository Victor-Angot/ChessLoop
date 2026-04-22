export type TrainerColor = 'white' | 'black'

export interface Repertoire {
  id: string
  name: string
  side: TrainerColor
  createdAt: Date
}

export interface ChessLine {
  id: string
  repertoireId: string
  pgn: string
  moves: string[]
  /** When true, this line is excluded from review/random learning queues. */
  excluded?: boolean
  /**
   * Optional PGN comments extracted from the movetext.
   * `byPly[i]` contains comments attached to ply `i` (0-based, aligned with `moves[i]`).
   * `pre` contains comments that appear before the first move.
   */
  comments?: {
    pre?: string[]
    byPly?: string[][]
  }
  startFEN?: string
  metadata: {
    title: string
    subtitle: string
    color: TrainerColor
  }
  srs: {
    interval: number
    easiness: number
    repetitions: number
    seen: boolean
    nextReview: Date
    lastReviewed: Date | null
  }
  stats: {
    attempts: number
    successes: number
    lastScore: number
  }
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5
