import Database from 'better-sqlite3'
import type { AnalyticsSummary } from './analyticsTypes.js'
import {
  analyticsRecordLoginSqlite,
  analyticsSummarySqlite,
} from './analyticsSqlite.js'
import {
  clearPasswordResetFields,
  createUserGoogleOnly,
  createUserWithPassword,
  defaultDbPath,
  getUserByEmail,
  getUserByGoogleSub,
  getUserById,
  getUserByPasswordResetToken,
  linkGoogleToUser,
  openDb,
  setPasswordResetToken,
  updateUserPasswordHash,
  type UserRow,
} from './db.js'
import {
  createPgPool,
  PgStore,
  runPgMigrations,
} from './pgStore.js'
import {
  trainerSqliteDeleteRepertoire,
  trainerSqliteSnapshot,
  trainerSqliteUpsertLine,
  trainerSqliteUpsertRepertoire,
} from './trainerDbSqlite.js'
import type { TrainerChessLine, TrainerRepertoire } from './trainerTypes.js'

export type AppStore = {
  kind: 'sqlite' | 'pg'
  recordLogin(userId: string): Promise<void>
  getAnalyticsSummary(): Promise<AnalyticsSummary>
  getUserById(id: string): Promise<UserRow | undefined>
  getUserByEmail(email: string): Promise<UserRow | undefined>
  getUserByGoogleSub(googleSub: string): Promise<UserRow | undefined>
  getUserByPasswordResetToken(token: string): Promise<UserRow | undefined>
  createUserWithPassword(email: string, passwordHash: string): Promise<UserRow>
  createUserGoogleOnly(email: string, googleSub: string): Promise<UserRow>
  linkGoogleToUser(userId: string, googleSub: string): Promise<void>
  setPasswordResetToken(userId: string, token: string, expiresIso: string): Promise<void>
  clearPasswordResetFields(userId: string): Promise<void>
  updateUserPasswordHash(userId: string, passwordHash: string): Promise<void>
  trainerSnapshot(
    userId: string,
  ): Promise<{ repertoires: TrainerRepertoire[]; lines: TrainerChessLine[] }>
  trainerUpsertRepertoire(userId: string, rep: TrainerRepertoire): Promise<void>
  trainerUpsertLine(userId: string, line: TrainerChessLine): Promise<void>
  trainerDeleteRepertoire(userId: string, repertoireId: string): Promise<void>
  close(): Promise<void>
}

function wrapSqlite(db: InstanceType<typeof Database>): AppStore {
  return {
    kind: 'sqlite',
    recordLogin: async (userId) => {
      analyticsRecordLoginSqlite(db, userId)
    },
    getAnalyticsSummary: async () => analyticsSummarySqlite(db),
    getUserById: async (id) => getUserById(db, id),
    getUserByEmail: async (email) => getUserByEmail(db, email),
    getUserByGoogleSub: async (sub) => getUserByGoogleSub(db, sub),
    getUserByPasswordResetToken: async (token) => getUserByPasswordResetToken(db, token),
    createUserWithPassword: async (email, hash) => createUserWithPassword(db, email, hash),
    createUserGoogleOnly: async (email, sub) => createUserGoogleOnly(db, email, sub),
    linkGoogleToUser: async (userId, sub) => {
      linkGoogleToUser(db, userId, sub)
    },
    setPasswordResetToken: async (userId, token, exp) => {
      setPasswordResetToken(db, userId, token, exp)
    },
    clearPasswordResetFields: async (userId) => {
      clearPasswordResetFields(db, userId)
    },
    updateUserPasswordHash: async (userId, hash) => {
      updateUserPasswordHash(db, userId, hash)
    },
    trainerSnapshot: async (userId) => trainerSqliteSnapshot(db, userId),
    trainerUpsertRepertoire: async (userId, rep) => {
      trainerSqliteUpsertRepertoire(db, userId, rep)
    },
    trainerUpsertLine: async (userId, line) => {
      trainerSqliteUpsertLine(db, userId, line)
    },
    trainerDeleteRepertoire: async (userId, repId) => {
      trainerSqliteDeleteRepertoire(db, userId, repId)
    },
    close: async () => {
      db.close()
    },
  }
}

function wrapPg(pg: PgStore): AppStore {
  return {
    kind: 'pg',
    recordLogin: (userId) => pg.recordLogin(userId),
    getAnalyticsSummary: () => pg.getAnalyticsSummary(),
    getUserById: (id) => pg.getUserById(id),
    getUserByEmail: (email) => pg.getUserByEmail(email),
    getUserByGoogleSub: (sub) => pg.getUserByGoogleSub(sub),
    getUserByPasswordResetToken: (token) => pg.getUserByPasswordResetToken(token),
    createUserWithPassword: (email, hash) => pg.createUserWithPassword(email, hash),
    createUserGoogleOnly: (email, sub) => pg.createUserGoogleOnly(email, sub),
    linkGoogleToUser: (userId, sub) => pg.linkGoogleToUser(userId, sub),
    setPasswordResetToken: (userId, token, exp) => pg.setPasswordResetToken(userId, token, exp),
    clearPasswordResetFields: (userId) => pg.clearPasswordResetFields(userId),
    updateUserPasswordHash: (userId, hash) => pg.updateUserPasswordHash(userId, hash),
    trainerSnapshot: (userId) => pg.trainerSnapshot(userId),
    trainerUpsertRepertoire: (userId, rep) => pg.trainerUpsertRepertoire(userId, rep),
    trainerUpsertLine: (userId, line) => pg.trainerUpsertLine(userId, line),
    trainerDeleteRepertoire: (userId, repId) => pg.trainerDeleteRepertoire(userId, repId),
    close: () => pg.end(),
  }
}

export async function createAppStore(): Promise<AppStore> {
  const url = process.env.DATABASE_URL?.trim()
  if (url) {
    const pool = createPgPool(url)
    await runPgMigrations(pool)
    return wrapPg(new PgStore(pool))
  }
  return wrapSqlite(openDb(defaultDbPath()))
}
