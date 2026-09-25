import { addMonths, monthKey } from "@/lib/money"
import { round2 } from "@/lib/month"

export type BaselineRow = { month: string; categoryId: number | null; spent: number }

export type BaselineStat = { avg: number; median: number; min: number; max: number; months: number }

export function median(values: number[]) {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function stat(values: number[]): BaselineStat {
  if (values.length === 0) return { avg: 0, median: 0, min: 0, max: 0, months: 0 }
  return {
    avg: round2(values.reduce((a, b) => a + b, 0) / values.length),
    median: round2(median(values)),
    min: round2(Math.min(...values)),
    max: round2(Math.max(...values)),
    months: values.length,
  }
}

/** Full months of the current year before `current`; if fewer than 3, the last 6 full months. */
export function baselineMonths(current = monthKey()) {
  const year = current.slice(0, 4)
  const out: string[] = []
  for (let m = addMonths(current, -1); m.startsWith(year); m = addMonths(m, -1)) out.unshift(m)
  if (out.length >= 3) return out
  return Array.from({ length: 6 }, (_, i) => addMonths(current, -(6 - i)))
}

/** Per-category and total stats over `months`; a category with no spend in a month counts as 0 for that month. */
export function computeBaseline(rows: BaselineRow[], months: string[]) {
  const byCat = new Map<number | null, Map<string, number>>()
  const totals = new Map<string, number>()
  for (const r of rows) {
    if (!months.includes(r.month)) continue
    if (!byCat.has(r.categoryId)) byCat.set(r.categoryId, new Map())
    const m = byCat.get(r.categoryId)!
    m.set(r.month, (m.get(r.month) ?? 0) + r.spent)
    totals.set(r.month, (totals.get(r.month) ?? 0) + r.spent)
  }
  const categories = new Map<number | null, BaselineStat>()
  for (const [cat, m] of byCat) categories.set(cat, stat(months.map((mo) => m.get(mo) ?? 0)))
  return { months, total: stat(months.map((mo) => totals.get(mo) ?? 0)), categories }
}
