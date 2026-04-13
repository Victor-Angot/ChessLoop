import type { ChessLine, ReviewQuality } from '../types/chess.types'

/** Mutates `line` in place (clone before calling). */
export function reviewLine(line: ChessLine, quality: ReviewQuality): void {
  const s = line.srs

  if (quality < 3) {
    s.repetitions = 0
    s.interval = 0
  } else {
    if (s.repetitions === 0) {
      s.interval = 1
    } else if (s.repetitions === 1) {
      s.interval = 6
    } else {
      s.interval *= s.easiness
    }
    s.repetitions += 1
  }

  s.easiness = Math.max(
    1.3,
    s.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  )

  s.nextReview = new Date(Date.now() + s.interval * 86400000)
  s.lastReviewed = new Date()
}
