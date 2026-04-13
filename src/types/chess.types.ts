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
