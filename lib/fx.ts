/**
 * Foreign-currency → ILS conversion, used only when Financy gives us a card charge with no ILS amount yet
 * (e.g. a purchase abroad that the issuer has not converted/billed: chargedAmount in JPY, or only originalAmount).
 * The issuer's real ILS charge replaces the estimate on the next sync once it is booked.
 */

/** ILS per 1 unit of currency. Map keys are upper-case ISO codes. */
export type FxRates = Record<string, number>

/**
 * Built-in fallback (Bank of Israel representative rates, Nov 2026) so a missing network never turns ¥ into ₪.
 * Live rates from {@link fetchBoiRates} win whenever available.
 */
export const FALLBACK_ILS_RATES: FxRates = {
  USD: 3.343,
  EUR: 3.665,
  GBP: 4.3785,
  JPY: 0.021026,
  CHF: 3.985,
  AUD: 2.2153,
  CAD: 2.3304,
  DKK: 0.4903,
  NOK: 0.3418,
  SEK: 0.3264,
  ZAR: 0.1913,
  JOD: 4.7157,
  EGP: 0.0615,
}

const ILS_CODES = new Set(["ILS", "NIS", "₪"])

/** True when the currency is shekels, or unknown (Financy omits it on plain local rows). */
export function isIls(currency: string | null | undefined) {
  return !currency || ILS_CODES.has(currency.trim().toUpperCase())
}

/** Convert `amount` in `currency` to ILS, rounded to agorot. null when no rate is known. */
export function toIls(amount: number, currency: string | null | undefined, rates: FxRates = FALLBACK_ILS_RATES): number | null {
  if (isIls(currency)) return amount
  const code = currency!.trim().toUpperCase()
  const rate = rates[code] ?? FALLBACK_ILS_RATES[code]
  if (!rate || !Number.isFinite(rate)) return null
  return Math.round(amount * rate * 100) / 100
}

/** Current Bank of Israel representative rates (ILS per 1 unit). Returns the fallback table on any failure. */
export async function fetchBoiRates(): Promise<FxRates> {
  try {
    const res = await fetch("https://boi.org.il/PublicApi/GetExchangeRates", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`BOI ${res.status}`)
    const data = (await res.json()) as {
      exchangeRates?: {
        key?: string
        currentExchangeRate?: number
        unit?: number
      }[]
    }
    const rates: FxRates = { ...FALLBACK_ILS_RATES }
    for (const r of data.exchangeRates ?? []) {
      const rate = Number(r.currentExchangeRate) / (Number(r.unit) || 1)
      if (r.key && Number.isFinite(rate) && rate > 0) rates[r.key.toUpperCase()] = rate
    }
    return rates
  } catch (e) {
    console.warn("BOI exchange rates unavailable, using built-in fallback", e)
    return { ...FALLBACK_ILS_RATES }
  }
}
