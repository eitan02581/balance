import { mapFinancyCategory } from "./category-map"
import { CARD_ISSUER_RE, CASH_RE, CASHBACK_RE, CLOTHING_RE, FEE_RE, INSURANCE_RE, LOAN_RE, NATIONAL_INSURANCE_RE, PEER_PAYMENT_RE, SALARY_RE, SAVINGS_RE, SUBSCRIPTION_RE, TRANSIT_RE, merchantKey } from "./rules"

export type TxLike = {
  id: string
  accountId: string
  accountType: string
  amount: number
  transactionDate: string
  merchantName: string | null
  description: string | null
  details?: string | null
  financyMain: string | null
  financySub: string | null
  manualLock: boolean
}

export type AccountLike = { id: string; accountType: string; role: string }

export type RuleLike = {
  merchantKey: string
  categoryId: number | null
  isExcluded: boolean
  exclusionReason: string | null
}

export type Classification = {
  balanceCategoryId: number | null
  categorySource: "mapping" | "merchant_rule" | "rule" | null
  isExcluded: boolean
  exclusionReason: "card_charge" | "internal_transfer" | "savings" | "income" | "manual" | "unreviewed" | "zero" | null
  needsReview: boolean
}

type CategoryIds = Record<string, number> // slug → id

const INCOME_SLUG = "income"
const SAVINGS_SLUG = "savings"
const TRANSFER_SLUG = "transfer"
const CARD_CHARGE_SLUG = "card-charge"
const TRANSFER_WINDOW_DAYS = 3

function daysBetween(a: string, b: string) {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000)
}

function isTransferRow(t: TxLike) {
  return t.financyMain === "TRANSFER" || t.financySub === "BANK_TRANSFER" || /העברה/.test(t.description ?? "")
}

/**
 * Greedy pairing of opposite-sign equal-amount bank transfers within 3 days.
 * Both rows must look like transfers (so a rent check never pairs with an unrelated deposit);
 * same-account pairs are allowed (money that passes through: in, then straight out).
 */
export function findInternalTransfers(txs: TxLike[], accounts: Map<string, AccountLike>): Set<string> {
  const paired = new Set<string>()
  const candidates = txs.filter((t) => {
    const a = accounts.get(t.accountId)
    return a && a.accountType !== "CARD" && a.role !== "ignore" && isTransferRow(t)
  })
  const byAbs = new Map<number, TxLike[]>()
  for (const t of candidates) {
    const k = Math.round(Math.abs(t.amount) * 100)
    if (!byAbs.has(k)) byAbs.set(k, [])
    byAbs.get(k)!.push(t)
  }
  for (const group of byAbs.values()) {
    const debits = group.filter((t) => t.amount < 0)
    const credits = group.filter((t) => t.amount > 0)
    for (const d of debits) {
      if (paired.has(d.id)) continue
      const match = credits.find((c) => !paired.has(c.id) && daysBetween(c.transactionDate, d.transactionDate) <= TRANSFER_WINDOW_DAYS)
      if (match) {
        paired.add(d.id)
        paired.add(match.id)
      }
    }
  }
  return paired
}

export function classifyAll(
  txs: TxLike[],
  accountList: AccountLike[],
  rules: RuleLike[],
  categoryIds: CategoryIds,
): Map<string, Classification> {
  const accounts = new Map(accountList.map((a) => [a.id, a]))
  const ruleByKey = new Map(rules.map((r) => [r.merchantKey, r]))
  const transfers = findInternalTransfers(txs, accounts)
  const out = new Map<string, Classification>()

  const excluded = (reason: Classification["exclusionReason"], slug: string, source: Classification["categorySource"] = "rule"): Classification => ({
    balanceCategoryId: categoryIds[slug] ?? null,
    categorySource: source,
    isExcluded: true,
    exclusionReason: reason,
    needsReview: false,
  })

  for (const t of txs) {
    if (t.manualLock) continue
    const account = accounts.get(t.accountId)
    const isCard = (account?.accountType ?? t.accountType) === "CARD"
    const text = `${t.merchantName ?? ""} ${t.description ?? ""} ${t.details ?? ""}`

    // 1. Remembered corrections win over heuristics.
    const rule = ruleByKey.get(merchantKey(t.merchantName, t.description, t.details))
    if (rule) {
      out.set(t.id, {
        balanceCategoryId: rule.categoryId,
        categorySource: "merchant_rule",
        isExcluded: rule.isExcluded,
        exclusionReason: rule.isExcluded ? ((rule.exclusionReason as Classification["exclusionReason"]) ?? "manual") : null,
        needsReview: false,
      })
      continue
    }

    // 2. Nothing left the account (fully discounted fee, info line): keep it visible, never count it.
    if (t.amount === 0) {
      out.set(t.id, { balanceCategoryId: null, categorySource: "rule", isExcluded: true, exclusionReason: "zero", needsReview: false })
      continue
    }

    // 2b. Whole account ignored / is a savings account.
    if (account?.role === "ignore") {
      out.set(t.id, excluded("manual", TRANSFER_SLUG))
      continue
    }
    if (account?.role === "savings") {
      out.set(t.id, excluded("savings", SAVINGS_SLUG))
      continue
    }

    // 3. Bank-side heuristics.
    if (!isCard) {
      if (t.amount < 0 && (t.financySub === "CREDIT_CARD_CHECKING" || CARD_ISSUER_RE.test(text))) {
        out.set(t.id, excluded("card_charge", CARD_CHARGE_SLUG))
        continue
      }
      if (transfers.has(t.id)) {
        out.set(t.id, excluded("internal_transfer", TRANSFER_SLUG))
        continue
      }
      if (t.amount < 0 && SAVINGS_RE.test(text)) {
        out.set(t.id, excluded("savings", SAVINGS_SLUG))
        continue
      }
      if (t.amount > 0) {
        // Income bucket by payer; unknown payers land in the generic "income" bucket until the user files them.
        const wanted = NATIONAL_INSURANCE_RE.test(text) ? "income-national-insurance" : SALARY_RE.test(text) ? "income-salary" : INCOME_SLUG
        out.set(t.id, excluded("income", categoryIds[wanted] != null ? wanted : INCOME_SLUG))
        continue
      }
    }

    // 4. Keyword overrides, then Financy category mapping (card refunds keep their category; month math subtracts them).
    if (PEER_PAYMENT_RE.test(text) || t.financySub === "BIT_PAYBOX") {
      out.set(t.id, { balanceCategoryId: null, categorySource: null, isExcluded: false, exclusionReason: null, needsReview: true })
      continue
    }
    const keyword = LOAN_RE.test(text) ? "loans" : INSURANCE_RE.test(text) ? "insurance" : CASHBACK_RE.test(text) ? "fees" : FEE_RE.test(text) ? "fees" : CLOTHING_RE.test(text) ? "clothing" : TRANSIT_RE.test(text) ? "car" : CASH_RE.test(text) ? "other" : SUBSCRIPTION_RE.test(text) ? "subscriptions" : null
    const slug = keyword ?? mapFinancyCategory(t.financyMain, t.financySub)
    if (slug === INCOME_SLUG) {
      out.set(t.id, excluded("income", INCOME_SLUG, "mapping"))
      continue
    }
    if (slug === SAVINGS_SLUG) {
      out.set(t.id, excluded("savings", SAVINGS_SLUG, "mapping"))
      continue
    }
    if (slug === CARD_CHARGE_SLUG) {
      out.set(t.id, excluded("card_charge", CARD_CHARGE_SLUG, "mapping"))
      continue
    }
    if (slug && categoryIds[slug] != null) {
      out.set(t.id, {
        balanceCategoryId: categoryIds[slug],
        categorySource: "mapping",
        isExcluded: false,
        exclusionReason: null,
        needsReview: false,
      })
      continue
    }

    // 5. Unknown → needs review. Card rows are real purchases, so they still count under "uncategorised";
    //    bank rows are usually money movement (checks, transfers to people), so they are held out until reviewed.
    out.set(t.id, {
      balanceCategoryId: null,
      categorySource: null,
      isExcluded: !isCard,
      exclusionReason: isCard ? null : "unreviewed",
      needsReview: true,
    })
  }
  return out
}
