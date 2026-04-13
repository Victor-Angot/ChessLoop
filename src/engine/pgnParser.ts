import { Chess } from 'chess.js'
import type { ChessLine, TrainerColor } from '../types/chess.types'

const BLOCK_SPLIT = /\n(?=\[Event\s+")/g

function normalizeBlock(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\b\d+\.\s*--\s*/g, '')
    .replace(/[➼•‣]/g, ' ')
}

function tagValue(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  )
  return key ? headers[key] : undefined
}

function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = pgn.split('\n')
  for (const line of lines) {
    const m = /^\[(\w+)\s+"([^"]*)"\]\s*$/.exec(line.trim())
    if (m) {
      headers[m[1]] = m[2]
    } else if (line.trim() && !line.trim().startsWith('[')) {
      break
    }
  }
  return headers
}

function openingNameFromTags(h: Record<string, string>): string {
  return (
    tagValue(h, 'Opening') ??
    tagValue(h, 'Event') ??
    tagValue(h, 'Site') ??
    'Unknown opening'
  )
}

function detectRepertoireColor(h: Record<string, string>): TrainerColor | null {
  const raw =
    tagValue(h, 'Repertoire') ??
    tagValue(h, 'TrainerColor') ??
    tagValue(h, 'Side')
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (
    v === 'white' ||
    v === 'w' ||
    v === 'blancs' ||
    v === 'blanc'
  ) {
    return 'white'
  }
  if (v === 'black' || v === 'b' || v === 'noirs' || v === 'noir') {
    return 'black'
  }
  return null
}

const FAR_DAYS = 3650

export function parsePgnToLinesMainline(
  pgnText: string,
  opts: { repertoireId: string; repertoireSide: TrainerColor },
): { lines: ChessLine[]; parsedBlocks: number; failedBlocks: number } {
  const trimmed = pgnText.trim()
  if (!trimmed) {
    return { lines: [], parsedBlocks: 0, failedBlocks: 0 }
  }

  let blocks = trimmed.split(BLOCK_SPLIT).map((b) => b.trim()).filter(Boolean)
  if (blocks.length === 0 || (blocks.length === 1 && !trimmed.includes('[Event'))) {
    blocks = [trimmed]
  }

  const lines: ChessLine[] = []
  let parsedBlocks = 0
  let failedBlocks = 0
  const now = Date.now()
  const farReview = new Date(now + FAR_DAYS * 86400000)

  for (const blockRaw of blocks) {
    const pgn = normalizeBlock(blockRaw)
    const headers = parseHeaders(pgn)
    const tagColor = detectRepertoireColor(headers)
    if (tagColor != null && tagColor !== opts.repertoireSide) {
      continue
    }

    const chess = new Chess()
    try {
      chess.loadPgn(pgn, { strict: false })
    } catch {
      failedBlocks += 1
      continue
    }

    if (chess.history().length === 0) {
      failedBlocks += 1
      continue
    }

    parsedBlocks += 1
    const moves = chess.history()
    const whiteTag = tagValue(headers, 'White')
    const title = whiteTag ?? openingNameFromTags(headers)
    const subtitle = tagValue(headers, 'Black') ?? ''

    lines.push({
      id: `line_${crypto.randomUUID()}`,
      repertoireId: opts.repertoireId,
      pgn: blockRaw,
      moves,
      metadata: {
        title,
        subtitle,
        color: opts.repertoireSide,
      },
      srs: {
        interval: 0,
        easiness: 2.5,
        repetitions: 0,
        seen: false,
        nextReview: farReview,
        lastReviewed: null,
      },
      stats: {
        attempts: 0,
        successes: 0,
        lastScore: 0,
      },
    })
  }

  return { lines, parsedBlocks, failedBlocks }
}
