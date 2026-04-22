import { Chess } from 'chess.js'
import type { ChessLine, TrainerColor } from '../types/chess.types'

const BLOCK_SPLIT = /\n(?=\[Event\s+")/g

function stripHeaders(block: string): string {
  const normalized = block.replace(/\r\n/g, '\n')
  // Standard: blank line after headers.
  const parts = normalized.split('\n\n')
  if (parts.length > 1) {
    return parts.slice(1).join('\n\n')
  }
  // Many files omit the blank line — strip consecutive `[Tag "value"]` header lines.
  const lines = normalized.split('\n')
  let i = 0
  while (i < lines.length) {
    const t = lines[i]!.trim()
    if (t.startsWith('[') && t.endsWith(']')) {
      i += 1
      continue
    }
    break
  }
  while (i < lines.length && lines[i]!.trim() === '') i += 1
  return lines.slice(i).join('\n') || normalized
}

function normalizeComment(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/**
 * Many PGNs (e.g. Chessable) glue the move number to the SAN: `1.e4`, `3...cxd5`, `12.Nf3`.
 * chess.js expects bare SAN — strip the numeric prefix so comment scanning stays on the mainline.
 */
function pgnCompactTokenToSan(tok: string): string | null {
  const t = tok.trim()
  if (!t) return null
  if (t === '1-0' || t === '0-1' || t === '1/2-1/2' || t === '*') return null
  if (t.startsWith('$')) return null
  if (/^\d+\.$/.test(t) || /^\d+\.\.$/.test(t) || /^\d+\.\.\.$/.test(t)) return null

  const black = /^(\d+)\.\.\.(.+)$/.exec(t)
  if (black) {
    const san = black[2]!.trim()
    return san || null
  }

  const white = /^(\d+)\.(.+)$/.exec(t)
  if (white) {
    const rest = white[2]!.trim()
    if (!rest || rest.startsWith('.')) return null
    return rest
  }

  return t
}

function tryPlaySan(chess: Chess, raw: string): boolean {
  let san = raw.trim()
  for (let k = 0; k < 8; k += 1) {
    const m = chess.move(san, { strict: false })
    if (m) return true
    const next = san.replace(/[!?+#=]+$/, '')
    if (next === san) break
    san = next
  }
  return false
}

function extractCommentsByPly(blockRaw: string, movesLen: number): { pre: string[]; byPly: string[][] } {
  const movetext = stripHeaders(blockRaw)
  const byPly: string[][] = Array.from({ length: movesLen }, () => [])
  const pre: string[] = []

  const chess = new Chess()
  let ply = 0
  let lastPlyWithMove = -1
  let varDepth = 0

  const pushComment = (text: string) => {
    const c = normalizeComment(text)
    if (!c) return
    if (lastPlyWithMove >= 0 && lastPlyWithMove < byPly.length) {
      byPly[lastPlyWithMove]!.push(c)
      return
    }
    pre.push(c)
  }

  let i = 0
  const n = movetext.length
  while (i < n) {
    const ch = movetext[i]!

    if (ch === '{') {
      const end = movetext.indexOf('}', i + 1)
      if (end === -1) break
      pushComment(movetext.slice(i + 1, end))
      i = end + 1
      continue
    }

    if (ch === ';') {
      // Semicolon comments run until EOL.
      let end = movetext.indexOf('\n', i + 1)
      if (end === -1) end = n
      pushComment(movetext.slice(i + 1, end))
      i = end + 1
      continue
    }

    if (ch === '(') {
      varDepth += 1
      i += 1
      continue
    }
    if (ch === ')') {
      varDepth = Math.max(0, varDepth - 1)
      i += 1
      continue
    }

    // Skip whitespace quickly.
    if (ch <= ' ') {
      i += 1
      continue
    }

    // Read next token.
    let j = i + 1
    while (j < n) {
      const cj = movetext[j]!
      if (cj <= ' ' || cj === '{' || cj === '}' || cj === '(' || cj === ')' || cj === ';') break
      j += 1
    }
    const tok = movetext.slice(i, j)
    i = j

    if (varDepth > 0) {
      continue
    }

    // Ignore move numbers, NAGs, and results.
    if (/^\d+\.(\.\.)?$/.test(tok) || /^\d+\.\.\.$/.test(tok)) continue
    if (tok === '1-0' || tok === '0-1' || tok === '1/2-1/2' || tok === '*') break
    if (tok.startsWith('$')) continue

    const san = pgnCompactTokenToSan(tok)
    if (!san) continue

    // Stay aligned with chess.js mainline only while there are expected moves left.
    // Do not stop early at the last move: Chessable-style PGN often puts a long `{...}`
    // comment *after* the final mainline SAN (still attached to that ply).
    if (ply < movesLen && tryPlaySan(chess, san)) {
      lastPlyWithMove = ply
      ply += 1
    }
  }

  return { pre, byPly }
}

function safeExtractCommentsByPly(
  blockRaw: string,
  movesLen: number,
): { pre: string[]; byPly: string[][] } {
  try {
    if (!Number.isFinite(movesLen) || movesLen <= 0) {
      return { pre: [], byPly: [] }
    }
    // Guard against pathological inputs (e.g. extremely large pasted files).
    if (blockRaw.length > 2_000_000) {
      return { pre: [], byPly: Array.from({ length: movesLen }, () => []) }
    }
    return extractCommentsByPly(blockRaw, movesLen)
  } catch {
    return { pre: [], byPly: Array.from({ length: movesLen }, () => []) }
  }
}

export function extractPgnCommentsForLine(
  pgn: string,
  movesLen: number,
): { pre: string[]; byPly: string[][] } {
  return safeExtractCommentsByPly(pgn, movesLen)
}

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
    const comments = safeExtractCommentsByPly(blockRaw, moves.length)

    lines.push({
      id: `line_${crypto.randomUUID()}`,
      repertoireId: opts.repertoireId,
      pgn: blockRaw,
      moves,
      comments: comments.pre.length || comments.byPly.some((c) => c.length) ? comments : undefined,
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
