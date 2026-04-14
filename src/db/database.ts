import type { ChessLine, Repertoire } from '../types/chess.types'
import {
  deleteTrainerRepertoireRemote,
  fetchTrainerSnapshot,
  putTrainerLines,
  putTrainerRepertoires,
} from '../lib/trainerApi'

export function asDate(v: unknown): Date {
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') return new Date(v)
  return new Date(0)
}

function hydrateRepertoire(r: Repertoire): Repertoire {
  return { ...r, createdAt: asDate(r.createdAt) }
}

export function hydrateLine(line: ChessLine): ChessLine {
  return {
    ...line,
    srs: {
      ...line.srs,
      nextReview: asDate(line.srs.nextReview),
      lastReviewed:
        line.srs.lastReviewed == null ? null : asDate(line.srs.lastReviewed),
    },
  }
}

export interface Snapshot {
  lines: ChessLine[]
  repertoires: Repertoire[]
}

let activeUserId: string | null = null

/** True when signed in — repertoires and PGN lines are loaded from the server database. */
export function hasTrainerDatabase(): boolean {
  return activeUserId !== null
}

/**
 * Bind trainer storage to the signed-in account (server-side DB via API).
 * Clears when logged out.
 */
export async function setTrainerDatabaseUser(userId: string | null): Promise<void> {
  if (userId === activeUserId) return
  activeUserId = userId
}

export async function loadSnapshot(): Promise<Snapshot> {
  if (!hasTrainerDatabase()) {
    return { lines: [], repertoires: [] }
  }
  const raw = await fetchTrainerSnapshot()
  return {
    lines: raw.lines.map(hydrateLine),
    repertoires: raw.repertoires.map(hydrateRepertoire),
  }
}

export async function bulkUpsertLines(lines: ChessLine[]): Promise<void> {
  if (!hasTrainerDatabase() || lines.length === 0) return
  await putTrainerLines(lines)
}

export async function bulkUpsertRepertoires(
  repertoires: Repertoire[],
): Promise<void> {
  if (!hasTrainerDatabase() || repertoires.length === 0) return
  await putTrainerRepertoires(repertoires)
}

export async function getAllLines(): Promise<ChessLine[]> {
  const { lines } = await loadSnapshot()
  return lines
}

export async function getDueLines(now: Date): Promise<ChessLine[]> {
  if (!hasTrainerDatabase()) return []
  const { lines } = await loadSnapshot()
  return lines.filter((l) => l.srs.nextReview.getTime() <= now.getTime())
}

export async function deleteRepertoire(id: string): Promise<void> {
  if (!hasTrainerDatabase()) return
  await deleteTrainerRepertoireRemote(id)
}
