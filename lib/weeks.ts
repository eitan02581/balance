import { daysInMonth, todayIL } from "@/lib/money"
import { round2 } from "@/lib/month"

export type Week = { index: number; from: string; to: string; days: number }

/** Calendar weeks of a month, Israeli style (Sunday–Saturday); the first and last may be partial. */
export function weeksOfMonth(month: string): Week[] {
  const [y, m] = month.split("-").map(Number)
  const n = daysInMonth(month)
  const pad = (d: number) => `${month}-${String(d).padStart(2, "0")}`
  const weeks: Week[] = []
  let start = 1
  while (start <= n) {
    const dow = new Date(Date.UTC(y, m - 1, start)).getUTCDay() // 0 = Sunday
    const end = Math.min(n, start + (6 - dow))
    weeks.push({ index: weeks.length + 1, from: pad(start), to: pad(end), days: end - start + 1 })
    start = end + 1
  }
  return weeks
}

export type WeekRow = Week & { spent: number; expected: number; status: "past" | "current" | "future"; onTrack: boolean | null }

/** Spend per week vs. the limit spread by days; `onTrack` only for weeks that have started. */
export function weeklyBreakdown(rows: { transactionDate: string; amount: number }[], month: string, limit: number | null, today = todayIL()): WeekRow[] {
  const n = daysInMonth(month)
  return weeksOfMonth(month).map((w) => {
    const spent = round2(rows.filter((r) => r.transactionDate >= w.from && r.transactionDate <= w.to).reduce((s, r) => s - r.amount, 0))
    const expected = limit ? round2((limit * w.days) / n) : 0
    const status: WeekRow["status"] = today > w.to ? "past" : today < w.from ? "future" : "current"
    const onTrack = !limit || status === "future" ? null : spent <= expected
    return { ...w, spent, expected, status, onTrack }
  })
}
