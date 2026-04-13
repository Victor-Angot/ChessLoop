/** Mirrors client `Repertoire` / `ChessLine` for JSON (de)serialization. */

export interface TrainerRepertoire {
  id: string
  name: string
  side: 'white' | 'black'
  createdAt: string | Date
}

export interface TrainerChessLine {
  id: string
  repertoireId: string
  pgn: string
  moves: string[]
  startFEN?: string
  metadata: {
    title: string
    subtitle: string
    color: 'white' | 'black'
  }
  srs: {
    interval: number
    easiness: number
    repetitions: number
    seen: boolean
    nextReview: string | Date
    lastReviewed: string | Date | null
  }
  stats: {
    attempts: number
    successes: number
    lastScore: number
  }
}
