/** Money that came in this month, by income bucket. Pure; used by the home card. */
export type IncomeRow = { amount: number; isExcluded: boolean; exclusionReason: string | null; balanceCategoryId: number | null }
export type IncomeBucket = { id: number | null; nameHe: string; emoji: string; amount: number; n: number }

export function isIncome(t: IncomeRow) {
  return t.isExcluded && t.exclusionReason === "income" && t.amount > 0
}

export function summarizeIncome(rows: IncomeRow[], categories: { id: number; nameHe: string; emoji: string; kind: string }[]) {
  const byId = new Map<number | null, IncomeBucket>()
  for (const r of rows) {
    if (!isIncome(r)) continue
    const cat = categories.find((c) => c.id === r.balanceCategoryId && c.kind === "income")
    const key = cat?.id ?? null
    const b = byId.get(key) ?? { id: key, nameHe: cat?.nameHe ?? "הכנסה", emoji: cat?.emoji ?? "💰", amount: 0, n: 0 }
    b.amount = Math.round((b.amount + r.amount) * 100) / 100
    b.n += 1
    byId.set(key, b)
  }
  const buckets = [...byId.values()].sort((a, b) => b.amount - a.amount)
  return { total: Math.round(buckets.reduce((s, b) => s + b.amount, 0) * 100) / 100, buckets }
}

export type InvestRow = { amount: number; isExcluded: boolean; exclusionReason: string | null }
export type InvestAccount = { role: string; accountType: string } | null | undefined

/** Money sent to savings/investments from a spending account. Rows inside a savings account itself are not counted (that would double-count the deposit). */
export function isInvestment(t: InvestRow, account: InvestAccount) {
  if (!t.isExcluded || t.exclusionReason !== "savings" || t.amount >= 0) return false
  if (account && (account.role === "savings" || account.accountType === "SAVINGS")) return false
  return true
}

export function sumInvested(rows: { tx: InvestRow; account: InvestAccount }[]) {
  return Math.round(rows.filter((r) => isInvestment(r.tx, r.account)).reduce((s, r) => s - r.tx.amount, 0) * 100) / 100
}
