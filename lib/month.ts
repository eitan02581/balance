import { daysLeftInMonth, pct, todayIL } from "@/lib/money"

export type MonthTx = {
  amount: number
  isExcluded: boolean
  accountType: string
  balanceCategoryId: number | null
  needsReview: boolean
}

export type CategoryInfo = { id: number; slug: string; nameHe: string; emoji: string; kind: string; monthlyTarget: number | null }

export type CategorySpend = CategoryInfo & {
  spent: number
  pctUsed: number | null // null when no target
  state: "ok" | "warn" | "hot" | "none"
}

export type MonthSummary = {
  month: string
  spendingTarget: number
  savingsTarget: number
  spent: number
  remaining: number // may be negative
  bonus: number // == remaining; "extra saving if the month ended now"
  expectedSavings: number
  progressPct: number
  daysLeft: number
  needsReviewCount: number
  uncategorised: number
  categories: CategorySpend[] // expense categories only, sorted by spent desc
}

export function isSpending(t: MonthTx) {
  return !t.isExcluded && t.accountType !== "SAVINGS"
}

export function sumSpent(txs: MonthTx[]) {
  return round2(txs.filter(isSpending).reduce((s, t) => s - t.amount, 0))
}

export function barState(spent: number, target: number | null): CategorySpend["state"] {
  if (!target || target <= 0) return "none"
  const p = spent / target
  if (p >= 0.95) return "hot"
  if (p >= 0.8) return "warn"
  return "ok"
}

export function computeMonth(input: {
  month: string
  spendingTarget: number
  savingsTarget: number
  txs: MonthTx[]
  categories: CategoryInfo[]
  today?: string
}): MonthSummary {
  const { month, spendingTarget, savingsTarget, txs, categories } = input
  const spending = txs.filter(isSpending)
  const spent = round2(spending.reduce((s, t) => s - t.amount, 0))
  const remaining = round2(spendingTarget - spent)

  const byCat = new Map<number, number>()
  let uncategorised = 0
  for (const t of spending) {
    if (t.balanceCategoryId == null) uncategorised -= t.amount
    else byCat.set(t.balanceCategoryId, (byCat.get(t.balanceCategoryId) ?? 0) - t.amount)
  }

  const cats: CategorySpend[] = categories
    .filter((c) => c.kind === "expense")
    .map((c) => {
      const s = round2(byCat.get(c.id) ?? 0)
      return { ...c, spent: s, pctUsed: c.monthlyTarget ? pct(s, c.monthlyTarget) : null, state: barState(s, c.monthlyTarget) }
    })
    .sort((a, b) => b.spent - a.spent)

  return {
    month,
    spendingTarget,
    savingsTarget,
    spent,
    remaining,
    bonus: remaining,
    expectedSavings: round2(savingsTarget + remaining),
    progressPct: pct(spent, spendingTarget),
    daysLeft: daysLeftInMonth(month, input.today ?? todayIL()),
    needsReviewCount: txs.filter((t) => t.needsReview).length,
    uncategorised: round2(uncategorised),
    categories: cats,
  }
}

export type CloseLike = { month: string; surplus: number }

/** Consecutive months (from the latest close backwards) with surplus > 0. */
export function streak(closes: CloseLike[]) {
  const sorted = [...closes].sort((a, b) => (a.month < b.month ? 1 : -1))
  let n = 0
  for (const c of sorted) {
    if (c.surplus > 0) n++
    else break
  }
  return n
}

/** Can `month` be closed today? Past months always; the current month from the 28th. */
export function canCloseMonth(month: string, today = todayIL()) {
  const cur = today.slice(0, 7)
  if (month < cur) return true
  if (month === cur) return Number(today.slice(8, 10)) >= 28
  return false
}

export const MILESTONES = [25, 50, 75, 100] as const

export function nextMilestone(current: number, target: number) {
  const p = target > 0 ? (current / target) * 100 : 0
  const next = MILESTONES.find((m) => m > p)
  if (!next) return null
  return { pct: next, amountLeft: round2((next / 100) * target - current) }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Supermarket: a single purchase of this size or more is a "main shop"; smaller ones are top-ups. */
export const GROCERY_MAIN_THRESHOLD = 300

export function grocerySplit(rows: { amount: number; isExcluded?: boolean }[]) {
  const main = { n: 0, total: 0 }
  const additions = { n: 0, total: 0 }
  for (const r of rows) {
    if (r.isExcluded || r.amount >= 0) continue
    const v = -r.amount
    const b = v >= GROCERY_MAIN_THRESHOLD ? main : additions
    b.n++
    b.total += v
  }
  return { main: { ...main, total: round2(main.total) }, additions: { ...additions, total: round2(additions.total) } }
}
