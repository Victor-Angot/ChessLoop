import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { AnalyticsSummary } from './analyticsTypes.js'

export function migrateAnalyticsTablesSqlite(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_logins_created ON analytics_logins(created_at);
  `)
}

export function analyticsRecordLoginSqlite(db: Database.Database, userId: string): void {
  db.prepare(
    `INSERT INTO analytics_logins (id, user_id, created_at) VALUES (?, ?, ?)`,
  ).run(randomUUID(), userId, new Date().toISOString())
}

export function analyticsSummarySqlite(db: Database.Database): AnalyticsSummary {
  const totalAccounts = (
    db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }
  ).n

  const now = Date.now()
  const isoAgo = (ms: number) => new Date(now - ms).toISOString()

  const countSince = (sinceIso: string): number =>
    (
      db
        .prepare(
          `SELECT COUNT(*) as n FROM analytics_logins WHERE created_at >= ?`,
        )
        .get(sinceIso) as { n: number }
    ).n

  const loginsLast24Hours = countSince(isoAgo(86400000))
  const loginsLast7Days = countSince(isoAgo(7 * 86400000))
  const loginsLast30Days = countSince(isoAgo(30 * 86400000))

  const since14 = isoAgo(14 * 86400000)
  const rows = db
    .prepare(
      `SELECT substr(created_at, 1, 10) as d, COUNT(*) as c
       FROM analytics_logins
       WHERE created_at >= ?
       GROUP BY substr(created_at, 1, 10)
       ORDER BY d`,
    )
    .all(since14) as { d: string; c: number }[]

  return {
    totalAccounts,
    loginsLast24Hours,
    loginsLast7Days,
    loginsLast30Days,
    loginsByDay: rows.map((r) => ({ date: r.d, count: r.c })),
  }
}
