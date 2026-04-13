import {
  bulkUpsertLines,
  bulkUpsertRepertoires,
  loadSnapshot,
} from '../db/database'
import { parsePgnToLinesMainline } from '../engine/pgnParser'
import type { ChessLine, Repertoire, TrainerColor } from '../types/chess.types'

export type { Snapshot } from '../db/database'

export interface ImportPgnResult {
  imported: number
  failedBlocks: number
  parsedBlocks: number
  lines: ChessLine[]
  repertoires: Repertoire[]
  repertoireId: string
}

export async function importRepertoireFromPgn(
  pgnText: string,
  repertoireName: string,
  side: TrainerColor,
): Promise<ImportPgnResult> {
  const repertoire: Repertoire = {
    id: crypto.randomUUID(),
    name: repertoireName.trim() || 'New repertoire',
    side,
    createdAt: new Date(),
  }
  await bulkUpsertRepertoires([repertoire])

  const { lines, parsedBlocks, failedBlocks } = parsePgnToLinesMainline(
    pgnText,
    { repertoireId: repertoire.id, repertoireSide: side },
  )
  await bulkUpsertLines(lines)

  const snapshot = await loadSnapshot()
  return {
    imported: lines.length,
    failedBlocks,
    parsedBlocks,
    lines: snapshot.lines,
    repertoires: snapshot.repertoires,
    repertoireId: repertoire.id,
  }
}
