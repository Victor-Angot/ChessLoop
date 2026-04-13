import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrateAnalyticsTablesSqlite } from './analyticsSqlite.js'
import { migrateTrainerTablesSqlite } from './trainerDbSqlite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface UserRow {
  id: string
  email: string
  password_hash: string | null
  google_sub: string | null
  created_at: string
  password_reset_token: string | null
  password_reset_expires: string | null
}

const USER_COLUMNS =
  'id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires'

function migrateUsers(db: Database.Database): void {
  const rows = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  const names = new Set(rows.map((r) => r.name))
  if (!names.has('password_reset_token')) {
    db.exec('ALTER TABLE users ADD COLUMN password_reset_token TEXT')
  }
  if (!names.has('password_reset_expires')) {
    db.exec('ALTER TABLE users ADD COLUMN password_reset_expires TEXT')
  }
}

export function openDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath)
  fs.mkdirSync(dir, { recursive: true })
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TEXT NOT NULL
    );
  `)
  migrateUsers(db)
  migrateTrainerTablesSqlite(db)
  migrateAnalyticsTablesSqlite(db)
  return db
}

export function defaultDbPath(): string {
  const fromEnv = process.env.DATABASE_PATH
  if (fromEnv) return path.resolve(fromEnv)
  return path.join(__dirname, 'data', 'app.db')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getUserById(db: Database.Database, id: string): UserRow | undefined {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined
}

export function getUserByEmail(
  db: Database.Database,
  email: string,
): UserRow | undefined {
  return db
    .prepare(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(normalizeEmail(email)) as UserRow | undefined
}

export function getUserByGoogleSub(
  db: Database.Database,
  googleSub: string,
): UserRow | undefined {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE google_sub = ?`)
    .get(googleSub) as UserRow | undefined
}

export function getUserByPasswordResetToken(
  db: Database.Database,
  token: string,
): UserRow | undefined {
  const now = new Date().toISOString()
  return db
    .prepare(
      `SELECT ${USER_COLUMNS} FROM users WHERE password_reset_token = ? AND password_reset_expires > ?`,
    )
    .get(token, now) as UserRow | undefined
}

export function createUserWithPassword(
  db: Database.Database,
  email: string,
  passwordHash: string,
): UserRow {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const norm = normalizeEmail(email)
  db.prepare(
    `INSERT INTO users (id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires)
     VALUES (?, ?, ?, NULL, ?, NULL, NULL)`,
  ).run(id, norm, passwordHash, createdAt)
  return {
    id,
    email: norm,
    password_hash: passwordHash,
    google_sub: null,
    created_at: createdAt,
    password_reset_token: null,
    password_reset_expires: null,
  }
}

export function createUserGoogleOnly(
  db: Database.Database,
  email: string,
  googleSub: string,
): UserRow {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const norm = normalizeEmail(email)
  db.prepare(
    `INSERT INTO users (id, email, password_hash, google_sub, created_at, password_reset_token, password_reset_expires)
     VALUES (?, ?, NULL, ?, ?, NULL, NULL)`,
  ).run(id, norm, googleSub, createdAt)
  return {
    id,
    email: norm,
    password_hash: null,
    google_sub: googleSub,
    created_at: createdAt,
    password_reset_token: null,
    password_reset_expires: null,
  }
}

export function linkGoogleToUser(
  db: Database.Database,
  userId: string,
  googleSub: string,
): void {
  db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(googleSub, userId)
}

export function setPasswordResetToken(
  db: Database.Database,
  userId: string,
  token: string,
  expiresIso: string,
): void {
  db.prepare(
    'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
  ).run(token, expiresIso, userId)
}

export function clearPasswordResetFields(db: Database.Database, userId: string): void {
  db.prepare(
    'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
  ).run(userId)
}

export function updateUserPasswordHash(
  db: Database.Database,
  userId: string,
  passwordHash: string,
): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
}
