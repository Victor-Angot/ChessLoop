/**
 * Comma-separated admin emails (lowercase match). Empty = no in-app analytics access.
 * Example: ADMIN_EMAILS=you@example.com,other@example.com
 */
export function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? ''
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )
  return set.has(email.trim().toLowerCase())
}
