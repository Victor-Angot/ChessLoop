export interface AnalyticsSummary {
  totalAccounts: number
  loginsLast24Hours: number
  loginsLast7Days: number
  loginsLast30Days: number
  /** UTC date `YYYY-MM-DD` → successful sign-in count */
  loginsByDay: { date: string; count: number }[]
}
