import { randomUUID } from 'crypto'
import type { Pool, QueryResultRow } from 'pg'
import { Pool as PgPool } from 'pg'
import type { AnalyticsSummary } from './analyticsTypes.js'
import type { UserRow } from './db.js'
import { normalizeEmail } from './db.js'
import type { TrainerChessLine, TrainerRepertoire } from './trainerTypes.js'

const USER_COLUMNS =
  'id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires'

export async function runPgMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      password_reset_token TEXT,
      password_reset_expires TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS trainer_repertoires (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE TABLE IF NOT EXISTS trainer_lines (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      repertoire_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id, repertoire_id) REFERENCES trainer_repertoires(user_id, id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS analytics_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_logins_created ON analytics_logins(created_at);
  `)
}

function rowToUser(r: QueryResultRow): UserRow {
  return {
    id: r.id,
    email: r.email,
    password_hash: r.password_hash,
    google_sub: r.google_sub,
    created_at:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    password_reset_token: r.password_reset_token,
    password_reset_expires:
      r.password_reset_expires == null
        ? null
        : r.password_reset_expires instanceof Date
          ? r.password_reset_expires.toISOString()
          : String(r.password_reset_expires),
  }
}

export class PgStore {
  constructor(private readonly pool: Pool) {}

  async getUserById(id: string): Promise<UserRow | undefined> {
    const { rows } = await this.pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])
    return rows[0] ? rowToUser(rows[0]) : undefined
  }

  async getUserByEmail(email: string): Promise<UserRow | undefined> {
    const { rows } = await this.pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1)`,
      [normalizeEmail(email)],
    )
    return rows[0] ? rowToUser(rows[0]) : undefined
  }

  async getUserByGoogleSub(googleSub: string): Promise<UserRow | undefined> {
    const { rows } = await this.pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE google_sub = $1`,
      [googleSub],
    )
    return rows[0] ? rowToUser(rows[0]) : undefined
  }

  async getUserByPasswordResetToken(token: string): Promise<UserRow | undefined> {
    const { rows } = await this.pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token],
    )
    return rows[0] ? rowToUser(rows[0]) : undefined
  }

  async createUserWithPassword(email: string, passwordHash: string): Promise<UserRow> {
    const id = randomUUID()
    const createdAt = new Date()
    const norm = normalizeEmail(email)
    await this.pool.query(
      `INSERT INTO users (id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires)
       VALUES ($1, $2, $3, NULL, $4, NULL, NULL)`,
      [id, norm, passwordHash, createdAt],
    )
    return {
      id,
      email: norm,
      password_hash: passwordHash,
      google_sub: null,
      created_at: createdAt.toISOString(),
      password_reset_token: null,
      password_reset_expires: null,
    }
  }

  async createUserGoogleOnly(email: string, googleSub: string): Promise<UserRow> {
    const id = randomUUID()
    const createdAt = new Date()
    const norm = normalizeEmail(email)
    await this.pool.query(
      `INSERT INTO users (id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires)
       VALUES ($1, $2, NULL, $3, $4, NULL, NULL)`,
      [id, norm, googleSub, createdAt],
    )
    return {
      id,
      email: norm,
      password_hash: null,
      google_sub: googleSub,
      created_at: createdAt.toISOString(),
      password_reset_token: null,
      password_reset_expires: null,
    }
  }

  async linkGoogleToUser(userId: string, googleSub: string): Promise<void> {
    await this.pool.query(`UPDATE users SET google_sub = $1 WHERE id = $2`, [googleSub, userId])
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expiresIso: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2::timestamptz WHERE id = $3`,
      [token, expiresIso, userId],
    )
  }

  async clearPasswordResetFields(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1`,
      [userId],
    )
  }

  async updateUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ])
  }

  async trainerSnapshot(
    userId: string,
  ): Promise<{ repertoires: TrainerRepertoire[]; lines: TrainerChessLine[] }> {
    const reps = await this.pool.query(
      `SELECT id, name, side, created_at FROM trainer_repertoires WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    )
    const lines = await this.pool.query(
      `SELECT payload FROM trainer_lines WHERE user_id = $1`,
      [userId],
    )
    const repertoires: TrainerRepertoire[] = reps.rows.map((r) => ({
      id: r.id,
      name: r.name,
      side: r.side === 'black' ? 'black' : 'white',
      createdAt:
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }))
    const chessLines: TrainerChessLine[] = lines.rows.map((r) => r.payload as TrainerChessLine)
    return { repertoires, lines: chessLines }
  }

  async trainerUpsertRepertoire(userId: string, rep: TrainerRepertoire): Promise<void> {
    const created =
      rep.createdAt instanceof Date ? rep.createdAt : new Date(String(rep.createdAt))
    await this.pool.query(
      `INSERT INTO trainer_repertoires (user_id, id, name, side, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, id) DO UPDATE SET
         name = EXCLUDED.name,
         side = EXCLUDED.side,
         created_at = EXCLUDED.created_at`,
      [userId, rep.id, rep.name, rep.side, created],
    )
  }

  async trainerUpsertLine(userId: string, line: TrainerChessLine): Promise<void> {
    await this.pool.query(
      `INSERT INTO trainer_lines (user_id, id, repertoire_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_id, id) DO UPDATE SET
         repertoire_id = EXCLUDED.repertoire_id,
         payload = EXCLUDED.payload`,
      [userId, line.id, line.repertoireId, JSON.stringify(line)],
    )
  }

  async trainerDeleteRepertoire(userId: string, repertoireId: string): Promise<void> {
    await this.pool.query(`DELETE FROM trainer_lines WHERE user_id = $1 AND repertoire_id = $2`, [
      userId,
      repertoireId,
    ])
    await this.pool.query(`DELETE FROM trainer_repertoires WHERE user_id = $1 AND id = $2`, [
      userId,
      repertoireId,
    ])
  }

  async recordLogin(userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_logins (id, user_id, created_at) VALUES ($1, $2, NOW())`,
      [randomUUID(), userId],
    )
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const { rows: totalRows } = await this.pool.query(`SELECT COUNT(*)::int AS n FROM users`)
    const totalAccounts = totalRows[0]?.n ?? 0

    const { rows: r24 } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM analytics_logins WHERE created_at >= NOW() - INTERVAL '1 day'`,
    )
    const { rows: r7 } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM analytics_logins WHERE created_at >= NOW() - INTERVAL '7 days'`,
    )
    const { rows: r30 } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM analytics_logins WHERE created_at >= NOW() - INTERVAL '30 days'`,
    )

    const { rows: dayRows } = await this.pool.query<{
      d: string
      c: number
    }>(
      `SELECT to_char((created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS d, COUNT(*)::int AS c
       FROM analytics_logins
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY 1
       ORDER BY 1`,
    )

    return {
      totalAccounts,
      loginsLast24Hours: r24[0]?.n ?? 0,
      loginsLast7Days: r7[0]?.n ?? 0,
      loginsLast30Days: r30[0]?.n ?? 0,
      loginsByDay: dayRows.map((row) => ({ date: row.d, count: row.c })),
    }
  }

  async end(): Promise<void> {
    await this.pool.end()
  }
}

export function createPgPool(connectionString: string): Pool {
  return new PgPool({ connectionString })
}
