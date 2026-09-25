"use server"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/db"
import { accounts, actionProgress, categories, goalAllocations, goals, insightDismissals, merchantRules, monthCloses, monthlyPlans, rewardEvents, rewardSettings, transactions } from "@/db/schema"
import { checkPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/lib/auth"
import { merchantKey } from "@/lib/classify/rules"
import { reclassify, runSync } from "@/lib/financy/sync"
import { canCloseMonth } from "@/lib/month"
import { addMonths, todayIL } from "@/lib/money"
import { getBaseline, getCategoryDetail, getCategoryHistory, getInsightTransactions, getMonthSummary, getNeedsReview, getPlan } from "@/lib/queries"

function num(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""))
  return Number.isFinite(n) ? n : fallback
}

function revalidateAll() {
  revalidatePath("/", "layout")
}

/** Actions are reachable by direct POST, so each one checks the session itself instead of trusting proxy.ts alone. */
async function requireSession() {
  const jar = await cookies()
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) throw new Error("unauthorized")
}

// ---------- auth ----------

export async function login(_prev: { error: string }, formData: FormData) {
  const password = String(formData.get("password") ?? "")
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 1000)) // slows down password guessing
    return { error: "הסיסמה לא נכונה, נסו שוב." }
  }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions)
  redirect("/")
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect("/login")
}

// ---------- sync ----------

export async function syncNow() {
  await requireSession()
  try {
    const r = await runSync()
    revalidateAll()
    return { ok: true as const, txUpserted: r.txUpserted, reclassified: r.reclassified }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

// ---------- transactions ----------

/**
 * choice: "cat:<id>" → category (counts as spending), or "ex:<reason>" → excluded.
 * remember (default in the UI): the same choice is applied to EVERY transaction of this merchant, in every month,
 * and stored as a rule for future syncs. "manual" (לא נספר) keeps the category so "ספור שוב" can restore it.
 */
export async function classifyTransaction(input: { id: string; choice: string; remember: boolean; note?: string }) {
  await requireSession()
  const [kind, value] = input.choice.split(":")
  // cat:<id> = expense category · inc:<id> = income bucket (excluded from spending, reason "income") · ex:<reason> = other exclusion
  const patch =
    kind === "cat"
      ? { balanceCategoryId: Number(value), isExcluded: false, exclusionReason: null }
      : kind === "inc"
        ? { balanceCategoryId: Number(value), isExcluded: true, exclusionReason: "income" }
        : value === "manual"
          ? { isExcluded: true, exclusionReason: "manual" }
          : { balanceCategoryId: null, isExcluded: true, exclusionReason: value }
  const notePatch = input.note !== undefined ? { note: input.note.trim() || null } : {}
  const [row] = await db
    .update(transactions)
    .set({ ...patch, ...notePatch, categorySource: "manual", needsReview: false, manualLock: true })
    .where(eq(transactions.id, input.id))
    .returning({ merchantName: transactions.merchantName, description: transactions.description, details: transactions.details, merchantKey: transactions.merchantKey })
  const key = row?.merchantKey || (row ? merchantKey(row.merchantName, row.description, row.details) : "")
  // "Not counted" is a per-transaction decision (a reimbursed kitchen, a one-off); everything else propagates by merchant.
  if (row && input.remember && key && value !== "manual") {
    const rule = { merchantKey: key, categoryId: kind === "ex" ? null : Number(value), isExcluded: kind !== "cat", exclusionReason: kind === "ex" ? value : kind === "inc" ? "income" : null }
    await db.insert(merchantRules).values(rule).onConflictDoUpdate({ target: merchantRules.merchantKey, set: rule })
    await db
      .update(transactions)
      .set({ balanceCategoryId: rule.categoryId, isExcluded: rule.isExcluded, exclusionReason: rule.exclusionReason, categorySource: "merchant_rule", needsReview: false, manualLock: true })
      .where(and(eq(transactions.merchantKey, key), sql`${transactions.id} <> ${input.id}`))
  }
  revalidateAll()
}

/** Reverse "לא נספר": count the row again in its previous category (or send it to review if it had none). */
export async function recountTransaction(id: string) {
  await requireSession()
  const [row] = await db
    .select({ balanceCategoryId: transactions.balanceCategoryId, kind: categories.kind })
    .from(transactions)
    .leftJoin(categories, eq(transactions.balanceCategoryId, categories.id))
    .where(eq(transactions.id, id))
  // Income / savings rows come back as such (still out of spending); an expense row comes back into its category.
  const back = row?.kind === "income" ? { isExcluded: true, exclusionReason: "income" } : row?.kind === "savings" ? { isExcluded: true, exclusionReason: "savings" } : { isExcluded: false, exclusionReason: null }
  await db
    .update(transactions)
    .set({ ...back, manualLock: true, categorySource: "manual", needsReview: row?.balanceCategoryId == null })
    .where(eq(transactions.id, id))
  revalidateAll()
}

export async function unlockTransaction(id: string) {
  await requireSession()
  await db.update(transactions).set({ manualLock: false }).where(eq(transactions.id, id))
  await reclassify({ since: "1970-01-01", onlyIds: [id] })
  revalidateAll()
}

// ---------- accounts ----------

export async function updateAccount(formData: FormData) {
  await requireSession()
  const id = String(formData.get("id"))
  const role = String(formData.get("role") ?? "spending")
  const displayName = String(formData.get("displayName") ?? "").trim() || null
  await db.update(accounts).set({ role, displayName }).where(eq(accounts.id, id))
  await reclassify({ since: addMonths(new Date().toISOString().slice(0, 7), -12) + "-01" })
  revalidateAll()
}

// ---------- plan & categories ----------

export async function savePlan(formData: FormData) {
  await requireSession()
  const month = String(formData.get("month"))
  const values = {
    spendingTarget: num(formData.get("spendingTarget")),
    spendingFromCategories: formData.get("spendingFromCategories") === "on",
    savingsTarget: num(formData.get("savingsTarget")),
    defaultGoalId: formData.get("defaultGoalId") ? Number(formData.get("defaultGoalId")) : null,
    updatedAt: new Date(),
  }
  await db.insert(monthlyPlans).values({ month, ...values }).onConflictDoUpdate({ target: monthlyPlans.month, set: values })
  revalidateAll()
}

export async function saveCategoryTargets(formData: FormData) {
  await requireSession()
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("target_")) continue
    const id = Number(k.slice(7))
    const target = String(v).trim() === "" ? null : num(v)
    await db.update(categories).set({ monthlyTarget: target }).where(eq(categories.id, id))
  }
  revalidateAll()
}

// ---------- goals ----------

export async function createGoal(formData: FormData) {
  await requireSession()
  const initial = num(formData.get("initialAmount"))
  const [g] = await db
    .insert(goals)
    .values({ name: String(formData.get("name")).trim(), emoji: String(formData.get("emoji") || "🎯"), targetAmount: num(formData.get("targetAmount")), currentAmount: initial })
    .returning()
  if (initial > 0) await db.insert(goalAllocations).values({ goalId: g.id, month: new Date().toISOString().slice(0, 7), amount: initial, source: "manual" })
  if (formData.get("makeDefault")) {
    const month = new Date().toISOString().slice(0, 7)
    await getPlan(month)
    await db.update(monthlyPlans).set({ defaultGoalId: g.id }).where(eq(monthlyPlans.month, month))
  }
  revalidateAll()
  redirect(`/goals/${g.id}`)
}

export async function updateGoal(formData: FormData) {
  await requireSession()
  const id = Number(formData.get("id"))
  await db
    .update(goals)
    .set({ name: String(formData.get("name")).trim(), emoji: String(formData.get("emoji") || "🎯"), targetAmount: num(formData.get("targetAmount")) })
    .where(eq(goals.id, id))
  revalidateAll()
}

export async function archiveGoal(id: number) {
  await requireSession()
  await db.update(goals).set({ archivedAt: new Date() }).where(eq(goals.id, id))
  revalidateAll()
  redirect("/goals")
}

export async function setDefaultGoal(month: string, goalId: number) {
  await requireSession()
  await getPlan(month)
  await db.update(monthlyPlans).set({ defaultGoalId: goalId }).where(eq(monthlyPlans.month, month))
  revalidateAll()
}

// ---------- month close ----------

export async function closeMonth(formData: FormData) {
  await requireSession()
  const month = String(formData.get("month"))
  const goalId = formData.get("goalId") ? Number(formData.get("goalId")) : null
  if (!canCloseMonth(month)) throw new Error("אי אפשר לסגור את החודש הזה עדיין")
  const [existing] = await db.select().from(monthCloses).where(eq(monthCloses.month, month))
  if (existing) redirect(`/history`)

  const summary = await getMonthSummary(month)
  const surplus = summary.remaining
  const allocated = goalId && surplus > 0 ? surplus : 0

  await db.insert(monthCloses).values({
    month,
    spendingTarget: summary.spendingTarget,
    savingsTarget: summary.savingsTarget,
    actualSpend: summary.spent,
    surplus,
    allocatedGoalId: allocated > 0 ? goalId : null,
    allocatedAmount: allocated,
  })
  if (allocated > 0 && goalId) {
    await db.insert(goalAllocations).values({ goalId, month, amount: allocated, source: "month_close" })
    await db
      .update(goals)
      .set({ currentAmount: sql`${goals.currentAmount} + ${allocated}` })
      .where(and(eq(goals.id, goalId)))
  }
  await getPlan(addMonths(month, 1)) // make sure next month has a plan
  revalidateAll()
  redirect(allocated > 0 && goalId ? `/goals/${goalId}?closed=${month}` : "/history")
}


// ---------- read actions for client sheets ----------

export async function loadCategoryDetail(month: string, categoryId: number | null) {
  await requireSession()
  return getCategoryDetail(month, categoryId)
}

export async function loadInsightTransactions(filter: Parameters<typeof getInsightTransactions>[0]) {
  await requireSession()
  return getInsightTransactions(filter)
}

export async function loadCategoryHistory(categoryId: number, months: string[]) {
  await requireSession()
  return getCategoryHistory(categoryId, months)
}

export async function loadReviewQueue() {
  await requireSession()
  return getNeedsReview()
}

/** Copy this year's per-category median into the category targets. */
export async function applyBaselineAsTargets() {
  await requireSession()
  const b = await getBaseline()
  for (const [categoryId, stat] of b.categories) {
    if (categoryId == null) continue
    await db.update(categories).set({ monthlyTarget: Math.round(stat.median) || null }).where(eq(categories.id, categoryId))
  }
  revalidateAll()
}

export async function setTransactionNote(id: string, note: string) {
  await requireSession()
  await db.update(transactions).set({ note: note.trim() || null }).where(eq(transactions.id, id))
  revalidateAll()
}

// ---------- insights ----------

/** Hide an insight until it recurs (a newer occurrence than the dismissal brings it back). */
export async function dismissInsight(key: string) {
  await requireSession()
  await db.insert(insightDismissals).values({ key, dismissedAt: new Date() }).onConflictDoUpdate({ target: insightDismissals.key, set: { dismissedAt: new Date() } })
  revalidateAll()
}

// ---------- gym rewards ----------

/** One check-in per day. Returns the reward earned, or 0 if today was already checked in. */
export async function gymCheckIn(note?: string) {
  await requireSession()
  const date = todayIL()
  const [settings] = await db.select().from(rewardSettings).where(eq(rewardSettings.id, 1))
  const reward = settings?.rewardPerVisit ?? 50
  const [exists] = await db.select({ id: rewardEvents.id }).from(rewardEvents).where(and(eq(rewardEvents.kind, "checkin"), eq(rewardEvents.date, date)))
  if (exists) return { ok: false as const, reward: 0 }
  await db.insert(rewardEvents).values({ kind: "checkin", date, amount: reward, note: note?.trim() || null })
  revalidatePath("/gym")
  return { ok: true as const, reward }
}

export async function gymUndo(id: number) {
  await requireSession()
  await db.delete(rewardEvents).where(eq(rewardEvents.id, id))
  revalidatePath("/gym")
}

export async function gymSpend(formData: FormData) {
  await requireSession()
  const amount = num(formData.get("amount"))
  if (amount <= 0) return
  await db.insert(rewardEvents).values({ kind: "spend", date: todayIL(), amount: -amount, note: String(formData.get("note") ?? "").trim() || null })
  revalidatePath("/gym")
}

export async function saveGymSettings(formData: FormData) {
  await requireSession()
  const values = { name: String(formData.get("name") ?? "").trim() || "הבונוס שלי", rewardPerVisit: num(formData.get("rewardPerVisit"), 50), weeklyGoal: Math.max(1, Math.round(num(formData.get("weeklyGoal"), 3))) }
  await db.insert(rewardSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: rewardSettings.id, set: values })
  revalidatePath("/gym")
}

// ---------- action plan ----------

export async function setActionDone(key: string, done: boolean) {
  await requireSession()
  await db
    .insert(actionProgress)
    .values({ key, done, doneAt: done ? new Date() : null })
    .onConflictDoUpdate({ target: actionProgress.key, set: { done, doneAt: done ? new Date() : null } })
  revalidatePath("/plan")
}

export async function setActionNote(key: string, note: string) {
  await requireSession()
  const v = note.trim() || null
  await db.insert(actionProgress).values({ key, note: v }).onConflictDoUpdate({ target: actionProgress.key, set: { note: v } })
  revalidatePath("/plan")
}
