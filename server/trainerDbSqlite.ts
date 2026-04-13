import type Database from 'better-sqlite3'
import type { TrainerChessLine, TrainerRepertoire } from './trainerTypes.js'

/** PGN + SRS live in JSON; repertoires are normalized for FK integrity. */

export function migrateTrainerTablesSqlite(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trainer_repertoires (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trainer_lines (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      repertoire_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id, repertoire_id) REFERENCES trainer_repertoires(user_id, id) ON DELETE CASCADE
    );
  `)
}

export function trainerSqliteSnapshot(
  db: Database,
  userId: string,
): { repertoires: TrainerRepertoire[]; lines: TrainerChessLine[] } {
  const repRows = db
    .prepare(
      `SELECT id, name, side, created_at FROM trainer_repertoires WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as { id: string; name: string; side: string; created_at: string }[]

  const lineRows = db
    .prepare(`SELECT payload FROM trainer_lines WHERE user_id = ?`)
    .all(userId) as { payload: string }[]

  const repertoires = repRows.map((r) => ({
    id: r.id,
    name: r.name,
    side: r.side === 'black' ? 'black' : 'white',
    createdAt: new Date(r.created_at),
  }))

  const lines = lineRows.map((row) => JSON.parse(row.payload) as TrainerChessLine)

  return { repertoires, lines }
}

export function trainerSqliteUpsertRepertoire(
  db: Database,
  userId: string,
  rep: TrainerRepertoire,
): void {
  const created =
    rep.createdAt instanceof Date ? rep.createdAt.toISOString() : String(rep.createdAt)
  db.prepare(
    `INSERT INTO trainer_repertoires (user_id, id, name, side, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET
       name = excluded.name,
       side = excluded.side,
       created_at = excluded.created_at`,
  ).run(userId, rep.id, rep.name, rep.side, created)
}

export function trainerSqliteUpsertLine(
  db: Database,
  userId: string,
  line: TrainerChessLine,
): void {
  const payload = JSON.stringify(line)
  db.prepare(
    `INSERT INTO trainer_lines (user_id, id, repertoire_id, payload)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET
       repertoire_id = excluded.repertoire_id,
       payload = excluded.payload`,
  ).run(userId, line.id, line.repertoireId, payload)
}

export function trainerSqliteDeleteRepertoire(db: Database, userId: string, repertoireId: string): void {
  db.prepare(`DELETE FROM trainer_lines WHERE user_id = ? AND repertoire_id = ?`).run(
    userId,
    repertoireId,
  )
  db.prepare(`DELETE FROM trainer_repertoires WHERE user_id = ? AND id = ?`).run(userId, repertoireId)
}
