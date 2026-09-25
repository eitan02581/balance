import { and, eq, gte } from "drizzle-orm"

import { db } from "@/db"
import { accounts, categories, connections, insightDismissals, transactions } from "@/db/schema"
import { addMonths, formatILS, monthKey } from "@/lib/money"
import { accountLabel, connectionHealth } from "@/lib/providers"

export type Insight = {
  key: string // stable id for dismissals, e.g. "card-fee:<accountId>"
  kind: "fee" | "interest" | "subscriptions" | "over-target" | "connection" | "review"
  emoji: string
  title: string
  body: string
  action?: string // what to do about it
  amount?: number // per month, when meaningful
  latest: string // YYYY-MM-DD of the latest occurrence; the insight re-surfaces if this is after the dismissal
  href?: string
  filter?: InsightFilter // when set, the UI opens the matching transactions in a sheet instead of navigating
}

export type InsightFilter = { since: string; until?: string; categorySlug?: string; accountId?: string; pattern?: string; side?: "card" | "bank" }

export const CARD_FEE_PATTERN = "(דמי כרטיס|דמי הנפקה)"
export const INTEREST_PATTERN = "(ריבית|רבית|עמלת|עמלה)"

const CARD_FEE_RE = new RegExp(CARD_FEE_PATTERN, "i")
const FEE_REFUND_RE = /(החזר מדמי כרטיס|פטור והנחה מדמי כרטיס|זיכוי דמי כרטיס)/i
const INTEREST_RE = new RegExp(INTEREST_PATTERN, "i")

/** Data-driven, recomputed on every visit. Nothing is stored except dismissals. */
export async function getInsights({ includeDismissed = false } = {}): Promise<Insight[]> {
  const month = monthKey()
  const since = `${addMonths(month, -3)}-01`
  const out: Insight[] = []

  const [rows, accountList, conns, cats, dismissals] = await Promise.all([
    db
      .select({ accountId: transactions.accountId, merchantName: transactions.merchantName, description: transactions.description, details: transactions.details, amount: transactions.amount, date: transactions.transactionDate, month: transactions.month, categoryId: transactions.balanceCategoryId, isExcluded: transactions.isExcluded, accountType: transactions.accountType, merchantKey: transactions.merchantKey })
      .from(transactions)
      .where(and(gte(transactions.transactionDate, since), eq(transactions.isDuplicate, false))),
    db.select().from(accounts),
    db.select().from(connections),
    db.select().from(categories),
    db.select().from(insightDismissals),
  ])
  const acc = new Map(accountList.map((a) => [a.id, a]))
  const dismissed = new Map(dismissals.map((d) => [d.key, d.dismissedAt]))

  // 1. Card fees, per card. One phone call usually waives them.
  // Fees are netted against fee refunds ("100% החזר מדמי כרטיס", "פטור והנחה"); ₪0 rows (full discount at source) never get here.
  const feeByAccount = new Map<string, { total: number; refunded: number; n: number; latest: string; months: Set<string> }>()
  for (const r of rows) {
    if (r.accountType !== "CARD" || r.amount === 0) continue
    const text = `${r.merchantName ?? ""} ${r.description ?? ""} ${r.details ?? ""}`
    const isFee = r.amount < 0 && CARD_FEE_RE.test(text)
    const isFeeRefund = r.amount > 0 && FEE_REFUND_RE.test(text)
    if (!isFee && !isFeeRefund) continue
    const e = feeByAccount.get(r.accountId) ?? { total: 0, refunded: 0, n: 0, latest: "", months: new Set<string>() }
    if (isFee) {
      e.total += -r.amount
      e.n++
      e.months.add(r.month)
      if (r.date > e.latest) e.latest = r.date
    } else e.refunded += r.amount
    feeByAccount.set(r.accountId, e)
  }
  for (const [accountId, e] of feeByAccount) {
    const net = e.total - e.refunded
    if (net < 5) continue // fully (or nearly) refunded: nothing to fix
    const a = acc.get(accountId)
    const perMonth = net / Math.max(1, e.months.size)
    const refundNote = e.refunded > 0 ? ` (אחרי החזר של ${formatILS(e.refunded)})` : ""
    out.push({
      key: `card-fee:${accountId}`,
      kind: "fee",
      emoji: "💳",
      title: `דמי כרטיס ב${a ? accountLabel(a) : "כרטיס"}: ${formatILS(perMonth)} בחודש`,
      body: `${e.n} חיובים ב־${e.months.size} החודשים האחרונים, נטו ${formatILS(net)}${refundNote}. ${formatILS(perMonth * 12)} בשנה על כלום.`,
      action: "שיחה אחת לחברת האשראי: בקשו פטור מדמי כרטיס. ברוב המקרים מאשרים מיד, במיוחד אם מזכירים שיש לכם כרטיס נוסף.",
      amount: perMonth,
      latest: e.latest,
      filter: { since, accountId, pattern: CARD_FEE_PATTERN, side: "card" },
    })
  }

  // 2. Bank interest / fees on checking accounts.
  const bankFees = rows.filter((r) => r.amount < 0 && r.accountType !== "CARD" && INTEREST_RE.test(`${r.merchantName ?? ""} ${r.description ?? ""}`) && !r.isExcluded)
  const bankFeeTotal = bankFees.reduce((s, r) => s - r.amount, 0)
  if (bankFees.length && bankFeeTotal >= 30) {
    const total = bankFeeTotal
    const latest = bankFees.map((r) => r.date).sort().at(-1)!
    out.push({
      key: "bank-fees",
      kind: "interest",
      emoji: "🏦",
      title: `עמלות וריבית בבנק: ${formatILS(total)} ב־3 חודשים`,
      body: `${bankFees.length} חיובים של ריבית או עמלות בחשבונות העו״ש.`,
      action: "ריבית על מינוס נעלמת אם מעבירים כסף מהחיסכון לפני סוף החודש. עמלות עו״ש אפשר לבטל עם מסלול עמלות מתאים בבנק.",
      amount: total / 3,
      latest,
      filter: { since, pattern: INTEREST_PATTERN, side: "bank" },
    })
  }

  // 3. Recurring subscriptions: same merchant in each of the last 3 months.
  const subCat = cats.find((c) => c.slug === "subscriptions")
  if (subCat) {
    const byKey = new Map<string, { name: string; months: Set<string>; total: number; latest: string }>()
    for (const r of rows) {
      if (r.categoryId !== subCat.id || r.amount >= 0 || r.isExcluded || !r.merchantKey) continue
      const e = byKey.get(r.merchantKey) ?? { name: r.merchantName ?? r.description ?? r.merchantKey, months: new Set<string>(), total: 0, latest: "" }
      e.months.add(r.month)
      e.total += -r.amount
      if (r.date > e.latest) e.latest = r.date
      byKey.set(r.merchantKey, e)
    }
    const recurring = [...byKey.values()].filter((e) => e.months.size >= 3)
    if (recurring.length) {
      const monthly = recurring.reduce((s, e) => s + e.total / e.months.size, 0)
      out.push({
        key: `subscriptions:${recurring.length}`,
        kind: "subscriptions",
        emoji: "🔁",
        title: `${recurring.length} מנויים קבועים: ${formatILS(monthly)} בחודש`,
        body: recurring
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map((e) => `${e.name.trim()} (${formatILS(e.total / e.months.size)})`)
          .join(" · "),
        action: "עברו על הרשימה פעם בחודש. מנוי שלא השתמשתם בו החודש הוא הכסף הכי קל לחסוך.",
        amount: monthly,
        latest: recurring.map((e) => e.latest).sort().at(-1)!,
        filter: { since, categorySlug: "subscriptions" },
      })
    }
  }

  // 4. Categories over target for the last 2 full months.
  const prev1 = addMonths(month, -1)
  const prev2 = addMonths(month, -2)
  for (const c of cats) {
    if (c.kind !== "expense" || !c.monthlyTarget) continue
    const spend = (m: string) => rows.filter((r) => r.month === m && r.categoryId === c.id && !r.isExcluded).reduce((s, r) => s - r.amount, 0)
    const s1 = spend(prev1)
    const s2 = spend(prev2)
    if (s1 - c.monthlyTarget >= 100 && s2 - c.monthlyTarget >= 100) {
      out.push({
        key: `over-target:${c.id}:${prev1}`,
        kind: "over-target",
        emoji: c.emoji,
        title: `${c.nameHe}: מעל היעד חודשיים ברצף`,
        body: `${formatILS(s2)} ואז ${formatILS(s1)}, מול יעד של ${formatILS(c.monthlyTarget)}.`,
        action: "או שהיעד לא ריאלי (עדכנו אותו בהגדרות), או שיש כאן הרגל ששווה לבדוק. פתחו את הקטגוריה וראו מה חוזר.",
        latest: `${prev1}-28`,
        filter: { since: `${prev2}-01`, until: `${prev1}-31`, categorySlug: c.slug },
      })
    }
  }

  // 5. Connections that need attention.
  for (const c of conns) {
    const h = connectionHealth(c.status, c.expiryDate)
    if (h.tone === "ok" || c.status === "REPLACED") continue
    const a = accountList.find((x) => x.connectionId === c.id)
    out.push({
      key: `connection:${c.id}:${c.status}`,
      kind: "connection",
      emoji: "🔌",
      title: `${a ? accountLabel(a) : c.providerId}: ${h.label}`,
      body: "בלי חיבור תקין, ההוצאות מהמקור הזה לא נספרות והתמונה החודשית חסרה.",
      action: "חדשו את החיבור באפליקציית Financy.",
      latest: (c.lastFetchedAt ?? c.syncedAt).toISOString().slice(0, 10),
      href: "/accounts",
    })
  }

  const visible = includeDismissed ? out : out.filter((i) => { const d = dismissed.get(i.key); return !d || i.latest > d.toISOString().slice(0, 10) })
  return visible.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
}

export async function getInsightCount() {
  try {
    return (await getInsights()).length
  } catch {
    return 0
  }
}
