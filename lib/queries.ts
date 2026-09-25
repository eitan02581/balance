import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm"

import { db } from "@/db"
import { accounts, actionProgress, categories, connections, goalAllocations, goals, merchantRules, monthCloses, monthlyPlans, rewardEvents, rewardSettings, syncRuns, transactions, type Goal } from "@/db/schema"
import { baselineMonths, computeBaseline } from "@/lib/baseline"
import { computeMonth, grocerySplit, nextMilestone, streak, type MonthSummary } from "@/lib/month"
import { addMonths, formatILS, monthKey } from "@/lib/money"

export async function getLastSync() {
  const [row] = await db.select().from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(desc(syncRuns.finishedAt)).limit(1)
  const [last] = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1)
  return { lastOkAt: row?.finishedAt ?? null, lastRun: last ?? null }
}

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder))
}

/** Plan for `month`; if missing, cloned from the most recent earlier plan (or a default). */
export async function getPlan(month: string) {
  const [plan] = await db.select().from(monthlyPlans).where(eq(monthlyPlans.month, month))
  if (plan) return plan
  const [prev] = await db.select().from(monthlyPlans).where(lte(monthlyPlans.month, month)).orderBy(desc(monthlyPlans.month)).limit(1)
  const [created] = await db
    .insert(monthlyPlans)
    .values({ month, spendingTarget: prev?.spendingTarget ?? 15000, spendingFromCategories: prev?.spendingFromCategories ?? false, savingsTarget: prev?.savingsTarget ?? 5000, defaultGoalId: prev?.defaultGoalId ?? null })
    .onConflictDoNothing()
    .returning()
  return created ?? (await db.select().from(monthlyPlans).where(eq(monthlyPlans.month, month)))[0]
}

/** The month's spending limit: the typed number, or the sum of category targets when the plan says so. */
export function effectiveSpendingTarget(plan: { spendingTarget: number; spendingFromCategories: boolean }, cats: { kind: string; monthlyTarget: number | null }[]) {
  if (!plan.spendingFromCategories) return plan.spendingTarget
  return cats.filter((c) => c.kind === "expense").reduce((s, c) => s + (c.monthlyTarget ?? 0), 0)
}

export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const [plan, cats, txs] = await Promise.all([
    getPlan(month),
    getCategories(),
    db
      .select({ amount: transactions.amount, isExcluded: transactions.isExcluded, accountType: transactions.accountType, balanceCategoryId: transactions.balanceCategoryId, needsReview: transactions.needsReview })
      .from(transactions)
      .where(and(eq(transactions.month, month), eq(transactions.isDuplicate, false))),
  ])
  return computeMonth({ month, spendingTarget: effectiveSpendingTarget(plan, cats), savingsTarget: plan.savingsTarget, txs, categories: cats })
}

export type TxFilters = { month: string; categoryId?: number; uncategorised?: boolean; accountId?: string; q?: string; needsReview?: boolean; limit?: number }

export async function getTransactions(f: TxFilters) {
  const conds = [eq(transactions.month, f.month), eq(transactions.isDuplicate, false)]
  if (f.categoryId != null) conds.push(eq(transactions.balanceCategoryId, f.categoryId))
  if (f.uncategorised) conds.push(isNull(transactions.balanceCategoryId))
  if (f.accountId) conds.push(eq(transactions.accountId, f.accountId))
  if (f.needsReview) conds.push(eq(transactions.needsReview, true))
  if (f.q) conds.push(or(ilike(transactions.merchantName, `%${f.q}%`), ilike(transactions.description, `%${f.q}%`))!)
  return db
    .select({ tx: transactions, category: categories, account: accounts })
    .from(transactions)
    .leftJoin(categories, eq(transactions.balanceCategoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conds))
    .orderBy(desc(transactions.transactionDate), desc(transactions.id))
    .limit(f.limit ?? 500)
}

export async function getNeedsReview(limit = 100) {
  return db
    .select({ tx: transactions, account: accounts })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.needsReview, true), eq(transactions.isDuplicate, false)))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit)
}

export async function getNeedsReviewCount() {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.needsReview, true), eq(transactions.isDuplicate, false)))
  return r?.n ?? 0
}

export async function getAccountsWithHealth(month = monthKey()) {
  const rows = await db
    .select({ account: accounts, connection: connections })
    .from(accounts)
    .leftJoin(connections, eq(accounts.connectionId, connections.id))
    .where(eq(accounts.isDuplicate, false))
    .orderBy(asc(accounts.accountType), asc(accounts.providerId), asc(accounts.accountNumber), asc(accounts.id)) // full tie-break: an UPDATE must not reshuffle the cards
  const spend = await db
    .select({ accountId: transactions.accountId, spent: sql<number>`coalesce(sum(-amount),0)::float`, n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.month, month), eq(transactions.isExcluded, false), eq(transactions.isDuplicate, false)))
    .groupBy(transactions.accountId)
  const spendById = new Map(spend.map((s) => [s.accountId, s]))
  return rows.map((r) => ({ ...r, monthSpend: spendById.get(r.account.id)?.spent ?? 0, monthTxCount: spendById.get(r.account.id)?.n ?? 0 }))
}

export async function getGoals() {
  return db.select().from(goals).where(isNull(goals.archivedAt)).orderBy(asc(goals.createdAt))
}

export async function getGoal(id: number) {
  const [g] = await db.select().from(goals).where(eq(goals.id, id))
  if (!g) return null
  const allocations = await db.select().from(goalAllocations).where(eq(goalAllocations.goalId, id)).orderBy(desc(goalAllocations.createdAt))
  return { goal: g, allocations }
}

export async function getMonthClose(month: string) {
  const [c] = await db.select().from(monthCloses).where(eq(monthCloses.month, month))
  return c ?? null
}

export async function getHistory(year: number) {
  const all = await db.select({ close: monthCloses, goal: goals }).from(monthCloses).leftJoin(goals, eq(monthCloses.allocatedGoalId, goals.id)).orderBy(desc(monthCloses.month))
  const inYear = all.filter((r) => r.close.month.startsWith(`${year}-`))
  const extraThisYear = inYear.reduce((s, r) => s + Math.max(0, r.close.surplus), 0)
  const monthsOver = inYear.filter((r) => r.close.surplus > 0).length
  const [alloc] = await db.select({ total: sql<number>`coalesce(sum(amount),0)::float` }).from(goalAllocations)
  return { rows: inYear, extraThisYear, monthsOver, streak: streak(all.map((r) => r.close)), totalAllocated: alloc?.total ?? 0, years: [...new Set(all.map((r) => Number(r.close.month.slice(0, 4))))] }
}

export async function getMerchantRuleCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(merchantRules)
  return r?.n ?? 0
}

export type Win = { icon: "streak" | "goal"; title: string; sub: string }

/** Up to three small, honest wins for the dashboard. */
export async function getWins(summary: MonthSummary, defaultGoal: Goal | null): Promise<Win[]> {
  const wins: Win[] = []
  if (summary.spent <= 0) return wins
  const closes = await db.select({ month: monthCloses.month, surplus: monthCloses.surplus }).from(monthCloses)
  const s = streak(closes)
  if (s >= 2) wins.push({ icon: "streak", title: `${s} חודשים ברצף`, sub: "שבהם חסכתם מעבר ליעד החודשי." })
  if (defaultGoal && summary.bonus > 0) {
    const after = defaultGoal.currentAmount + summary.bonus
    const pctAfter = Math.min(100, Math.round((after / defaultGoal.targetAmount) * 100))
    const nm = nextMilestone(defaultGoal.currentAmount, defaultGoal.targetAmount)
    if (nm && after >= (nm.pct / 100) * defaultGoal.targetAmount) wins.push({ icon: "goal", title: `${nm.pct}% מ${defaultGoal.name} בהישג יד`, sub: `הבונוס הנוכחי יעלה אתכם לכ־${pctAfter}% מהיעד.` })
    else if (nm) wins.push({ icon: "goal", title: `עוד ${formatILS(nm.amountLeft)} ל־${nm.pct}% ב${defaultGoal.name}`, sub: `הבונוס הנוכחי יעלה אתכם לכ־${pctAfter}% מהיעד.` })
  }
  return wins.slice(0, 3)
}

export async function getSpendingTrend(months = 6, upTo = monthKey()) {
  const from = addMonths(upTo, -(months - 1))
  const rows = await db
    .select({ month: transactions.month, spent: sql<number>`coalesce(sum(-amount),0)::float` })
    .from(transactions)
    .where(and(gte(transactions.month, from), lte(transactions.month, upTo), eq(transactions.isExcluded, false), eq(transactions.isDuplicate, false)))
    .groupBy(transactions.month)
    .orderBy(asc(transactions.month))
  return rows
}


/** Per-category median/avg over the full months of this year (see lib/baseline.ts). */
export async function getBaseline(current = monthKey()) {
  const months = baselineMonths(current)
  const rows = await db
    .select({ month: transactions.month, categoryId: transactions.balanceCategoryId, spent: sql<number>`sum(-amount)::float` })
    .from(transactions)
    .where(and(gte(transactions.month, months[0]), lte(transactions.month, months[months.length - 1]), eq(transactions.isExcluded, false), eq(transactions.isDuplicate, false)))
    .groupBy(transactions.month, transactions.balanceCategoryId)
  return computeBaseline(rows, months)
}

/** Everything the category sheet needs: this month vs baseline, 6-month trend, transactions. */
export async function getCategoryDetail(month: string, categoryId: number | null) {
  const from = addMonths(month, -5)
  const catCond = categoryId == null ? isNull(transactions.balanceCategoryId) : eq(transactions.balanceCategoryId, categoryId)
  const [trend, rows, baseline, cat] = await Promise.all([
    db
      .select({ month: transactions.month, spent: sql<number>`coalesce(sum(-amount),0)::float` })
      .from(transactions)
      .where(and(gte(transactions.month, from), lte(transactions.month, month), catCond, eq(transactions.isExcluded, false), eq(transactions.isDuplicate, false)))
      .groupBy(transactions.month),
    getTransactions({ month, categoryId: categoryId ?? undefined, uncategorised: categoryId == null }),
    getBaseline(month),
    categoryId == null ? Promise.resolve(null) : db.select().from(categories).where(eq(categories.id, categoryId)).then((r) => r[0] ?? null),
  ])
  const byMonth = new Map(trend.map((t) => [t.month, t.spent]))
  const months = Array.from({ length: 6 }, (_, i) => addMonths(from, i))
  return {
    category: cat,
    trend: months.map((m) => ({ month: m, spent: byMonth.get(m) ?? 0 })),
    baseline: baseline.categories.get(categoryId) ?? { avg: 0, median: 0, min: 0, max: 0, months: 0 },
    // keep manually not-counted rows visible (dimmed) so the decision can be reversed in place
    transactions: rows.filter((r) => !r.tx.isExcluded || r.tx.exclusionReason === "manual"),
  }
}

/** Rows held out of spending this month, grouped for the "not counted" card. */
export async function getNotCounted(month: string) {
  const rows = await db
    .select({ tx: transactions, account: accounts })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.month, month), eq(transactions.isExcluded, true), eq(transactions.isDuplicate, false)))
    .orderBy(asc(transactions.exclusionReason), desc(transactions.transactionDate))
  return rows
}


/** Spending rows of the month (date + signed amount), for the weekly breakdown. */
export async function getMonthSpendRows(month: string) {
  return db
    .select({ transactionDate: transactions.transactionDate, amount: transactions.amount })
    .from(transactions)
    .where(and(eq(transactions.month, month), eq(transactions.isExcluded, false), eq(transactions.isDuplicate, false), sql`${transactions.accountType} <> 'SAVINGS'`))
}

export { getInsightCount } from "@/lib/insights"

export async function getGrocerySplit(month: string) {
  const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "groceries"))
  if (!cat) return null
  const rows = await db
    .select({ amount: transactions.amount, isExcluded: transactions.isExcluded })
    .from(transactions)
    .where(and(eq(transactions.month, month), eq(transactions.balanceCategoryId, cat.id), eq(transactions.isDuplicate, false)))
  return { categoryId: cat.id, ...grocerySplit(rows) }
}

/** Transactions behind an insight (fees on one card, recurring subscriptions, a category's bad months…). */
export async function getInsightTransactions(f: { since: string; until?: string; categorySlug?: string; accountId?: string; pattern?: string; side?: "card" | "bank" }) {
  const conds = [gte(transactions.transactionDate, f.since), eq(transactions.isDuplicate, false)]
  if (f.until) conds.push(lte(transactions.transactionDate, f.until))
  if (f.accountId) conds.push(eq(transactions.accountId, f.accountId))
  if (f.side === "card") conds.push(eq(transactions.accountType, "CARD"))
  if (f.side === "bank") conds.push(sql`${transactions.accountType} <> 'CARD'`)
  if (f.categorySlug) conds.push(eq(categories.slug, f.categorySlug))
  const rows = await db
    .select({ tx: transactions, category: categories, account: accounts })
    .from(transactions)
    .leftJoin(categories, eq(transactions.balanceCategoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conds))
    .orderBy(desc(transactions.transactionDate))
    .limit(300)
  if (!f.pattern) return rows
  const re = new RegExp(f.pattern, "i")
  return rows.filter((r) => re.test(`${r.tx.merchantName ?? ""} ${r.tx.description ?? ""}`))
}

export async function getGym() {
  let [settings] = await db.select().from(rewardSettings).where(eq(rewardSettings.id, 1))
  if (!settings) [settings] = await db.insert(rewardSettings).values({ id: 1 }).onConflictDoNothing().returning()
  if (!settings) [settings] = await db.select().from(rewardSettings).where(eq(rewardSettings.id, 1))
  const events = await db.select().from(rewardEvents).orderBy(desc(rewardEvents.date), desc(rewardEvents.id))
  return { settings, events }
}

/** A category's transactions across several months (baseline drill-down). */
export async function getCategoryHistory(categoryId: number, months: string[]) {
  if (months.length === 0) return []
  return db
    .select({ tx: transactions, account: accounts })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.balanceCategoryId, categoryId), inArray(transactions.month, months), eq(transactions.isDuplicate, false)))
    .orderBy(desc(transactions.month), desc(transactions.transactionDate))
    .limit(600)
}

export async function getActionProgress() {
  const rows = await db.select().from(actionProgress)
  return new Map(rows.map((r) => [r.key, r]))
}
