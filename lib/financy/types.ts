import { FALLBACK_ILS_RATES, isIls, toIls, type FxRates } from "@/lib/fx"

export type FinancyPage<T> = { count?: number; nextPage?: string | null; items: T[] }

export type FinancyConnection = {
  id: string
  providerId: string
  status: string
  mode?: string
  accounts?: number
  cards?: number
  expiryDate?: string | null
  lastFetchedAt?: string | null
  lastFetchedDataDate?: string | null
  createdAt?: string
}

export type FinancyBalance =
  | { amount: number; currency?: string }
  | { balanceType?: string; balanceAmount: { amount: number; currency?: string }; referenceDate?: string }

export type FinancyAccount = {
  id: string
  connectionId?: string
  providerId: string
  accountType: string
  accountName?: string
  currency?: string
  balances?: FinancyBalance[]
  creditLimit?: number | { amount: number } | null
  cardDueDate?: string | null
  accountNumber?: string | null
  isDuplicate?: boolean
  transactions?: number
}

export type FinancyCategory = { main?: string | null; sub?: string | null; categorizedBy?: string }

export type FinancyTransaction = {
  id: string
  details?: string | null
  creditorName?: string | null
  debtorName?: string | null
  categoryCode?: string | null
  SK?: string
  accountId: string
  providerId: string
  type?: string // NORMAL | INSTALLMENT
  status?: string // PENDING | BOOKED
  merchantName?: string | null
  amount?: {
    chargedAmount?: { amount: number; currency?: string }
    originalAmount?: { amount: number; currency?: string }
  }
  description?: { description?: string | null; additionalInfo?: string | null } | string | null
  category?: FinancyCategory | null
  changedCategory?: FinancyCategory | null
  classification?: { type?: string; source?: string } | null
  date?: { transactionDate?: string; bookingDate?: string; valueDate?: string }
  installments?: { number?: number; total?: number } | null
  isDuplicate?: boolean
  balancePerEndDay?: number
}

/** Financy sometimes sends "" or null where a number is expected. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function balanceAmount(b: FinancyBalance | undefined): number | null {
  if (!b) return null
  if ("balanceAmount" in b && b.balanceAmount) return num(b.balanceAmount.amount)
  if ("amount" in b) return num(b.amount)
  return null
}

/**
 * What actually left the account, in ILS (every total in the app is shekels).
 *
 * Issuers report a fully-discounted fee as chargedAmount "" with the list price in originalAmount (Isracard/AMEX/CAL
 * "דמי כרטיס", CAL CashPro info lines): that is a ₪0 charge, not the list price.
 *
 * A purchase abroad that the issuer has not converted yet (typically PENDING, sometimes the current cycle) comes with
 * chargedAmount in the foreign currency (e.g. JPY), or with no chargedAmount at all and only a foreign originalAmount.
 * Taking that number as shekels made ¥10,000 show up as ₪10,000. Such rows are converted with `rates`; the issuer's
 * real ILS charge replaces the estimate on a later sync. No currency on a field means ILS.
 */
export function txAmount(t: FinancyTransaction, rates: FxRates = FALLBACK_ILS_RATES) {
  return txAmountInfo(t, rates).amount
}

/** {@link txAmount} plus the currency the number was taken from (before conversion) and whether it was converted. */
export function txAmountInfo(t: FinancyTransaction, rates: FxRates = FALLBACK_ILS_RATES): { amount: number; sourceCurrency: string; converted: boolean } {
  const charged = t.amount?.chargedAmount
  const original = t.amount?.originalAmount
  if (charged && (charged.amount as unknown) === "") return { amount: 0, sourceCurrency: "ILS", converted: false }
  const c = num(charged?.amount)
  const o = num(original?.amount)
  const originalForeign = o !== null && o !== 0 && !isIls(original?.currency)

  // Charged amount is the truth when it is in shekels, except a ₪0 placeholder on a foreign purchase not yet billed.
  if (c !== null && isIls(charged?.currency) && !(c === 0 && originalForeign)) return { amount: c, sourceCurrency: "ILS", converted: false }
  // Charged, but in a foreign currency: convert it.
  if (c !== null && c !== 0 && !isIls(charged?.currency)) return convert(c, charged!.currency!, rates)
  // No usable charge yet: fall back to the original amount, converting it if it is foreign.
  if (o !== null) return originalForeign ? convert(o, original!.currency!, rates) : { amount: o, sourceCurrency: "ILS", converted: false }
  return { amount: c ?? 0, sourceCurrency: "ILS", converted: false }
}

function convert(amount: number, currency: string, rates: FxRates) {
  const ils = toIls(amount, currency, rates)
  if (ils === null) console.warn(`No ILS rate for ${currency}; counting the transaction as ₪0 until the issuer bills it in ILS`)
  return { amount: ils ?? 0, sourceCurrency: currency.trim().toUpperCase(), converted: true }
}

/** True when the transaction has no ILS charge yet and needs exchange rates to be counted. */
export function needsFx(t: FinancyTransaction) {
  return txAmountInfo(t).converted
}

/** Day of the transaction, YYYY-MM-DD. Bank rows come with transactionDate=null; bookingDate is the day the money moved. */
export function txDate(t: FinancyTransaction) {
  return (t.date?.transactionDate || t.date?.bookingDate || t.date?.valueDate)?.slice(0, 10) ?? null
}

/**
 * Card issuers report an authorization as a PENDING record, then book the charge under a NEW id (often with a
 * different merchant string and FX amount). Drop a pending item whose booked twin is in the same fetch.
 */
export function withoutSupersededPending(items: FinancyTransaction[]) {
  const booked = items.filter((t) => t.status === "BOOKED")
  return items.filter((t) => t.status !== "PENDING" || !booked.some((b) => isTwin(t, b)))
}

function isTwin(a: FinancyTransaction, b: FinancyTransaction) {
  const da = txDate(a)
  const db = txDate(b)
  if (a.accountId !== b.accountId || !da || !db) return false
  const amountA = num(a.amount?.originalAmount?.amount) ?? txAmount(a)
  const amountB = num(b.amount?.originalAmount?.amount) ?? txAmount(b)
  return amountA === amountB && Math.abs(Date.parse(da) - Date.parse(db)) <= 3 * 86_400_000
}

export function txDescription(t: FinancyTransaction) {
  if (!t.description) return null
  if (typeof t.description === "string") return t.description
  return t.description.description ?? null
}

/** Effective Financy category: the user's override inside Financy wins. */
export function txCategory(t: FinancyTransaction): FinancyCategory {
  const c = t.changedCategory?.main ? t.changedCategory : t.category
  return { main: c?.main ?? null, sub: c?.sub ?? null }
}

/** Human-useful context: Bit/Paybox payee, transfer purpose, counterparty. Empty string when nothing. */
export function txDetails(t: FinancyTransaction): string | null {
  const parts: string[] = []
  const raw = typeof t.description === "object" && t.description ? t.description : null
  if (t.details) {
    const cleaned = t.details
      .replace(/\s+/g, " ")
      .split(/\s*\.\s*(?=[^.]*:)|\s*\.\s*$/) // "סוג עסקה: חיוב. שם משלם: X. מטרת העברה: Y"
      .map((seg) => seg.replace(/^[.:\s]+|[.:\s]+$/g, ""))
      .filter((seg) => seg && !/^סוג עסקה/.test(seg) && !/^מטרת העברה$/.test(seg))
    parts.push(...cleaned)
  }
  if (raw?.additionalInfo) {
    try {
      const ai = JSON.parse(raw.additionalInfo) as Record<string, string | undefined>
      for (const k of ["purposeDescription", "specialDetails"]) if (ai[k] && !/^\d{2}-\d{3}-\d+$/.test(ai[k]!)) parts.push(ai[k]!.trim())
    } catch {
      /* not JSON */
    }
  }
  if (t.creditorName) parts.push(`אל: ${t.creditorName}`)
  if (t.debtorName) parts.push(`מאת: ${t.debtorName}`)
  const out = [...new Set(parts.filter(Boolean))].join(" · ")
  return out || null
}
