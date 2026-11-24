import { describe, expect, it } from "vitest"

import { needsFx, txAmount, txAmountInfo, withoutSupersededPending, type FinancyTransaction } from "@/lib/financy/types"
import { toIls } from "@/lib/fx"

describe("txAmount", () => {
  it("uses the charged amount, and treats an empty charged amount as ₪0 (full discount)", () => {
    expect(txAmount({ id: "a", accountId: "x", providerId: "max", amount: { chargedAmount: { amount: -17.9 }, originalAmount: { amount: -15.17 } } })).toBe(-17.9)
    expect(txAmount({ id: "b", accountId: "x", providerId: "isracard", amount: { chargedAmount: { amount: "" as unknown as number }, originalAmount: { amount: -17.9 } } })).toBe(0)
    expect(txAmount({ id: "c", accountId: "x", providerId: "cal", amount: { originalAmount: { amount: -50 } } })).toBe(-50)
  })

  const rates = { JPY: 0.021, USD: 3.4 }
  const jpy = (amount: FinancyTransaction["amount"], status = "PENDING"): FinancyTransaction => ({ id: "t", accountId: "x", providerId: "max", status, amount })

  it("uses the ILS charge of a booked yen purchase, never the yen amount", () => {
    const t = jpy({ chargedAmount: { amount: -212.4, currency: "ILS" }, originalAmount: { amount: -10000, currency: "JPY" } }, "BOOKED")
    expect(txAmount(t, rates)).toBe(-212.4)
    expect(needsFx(t)).toBe(false)
  })

  it("converts a charge still reported in yen (not yet billed in ILS) instead of counting ¥ as ₪", () => {
    const t = jpy({ chargedAmount: { amount: -10000, currency: "JPY" }, originalAmount: { amount: -10000, currency: "JPY" } })
    expect(txAmountInfo(t, rates)).toEqual({ amount: -210, sourceCurrency: "JPY", converted: true })
    expect(needsFx(t)).toBe(true)
  })

  it("converts a foreign original amount when there is no charged amount, or only a ₪0 placeholder", () => {
    expect(txAmount(jpy({ originalAmount: { amount: -5000, currency: "JPY" } }), rates)).toBe(-105)
    expect(txAmount(jpy({ chargedAmount: { amount: 0, currency: "ILS" }, originalAmount: { amount: -5000, currency: "jpy" } }), rates)).toBe(-105)
    expect(txAmount(jpy({ chargedAmount: { amount: -20, currency: "USD" } }), rates)).toBe(-68)
  })

  it("falls back to the built-in rate table when no live rate was fetched, and counts ₪0 for an unknown currency", () => {
    const fallback = txAmount(jpy({ chargedAmount: { amount: -10000, currency: "JPY" } }))
    expect(fallback).toBeLessThan(-100)
    expect(fallback).toBeGreaterThan(-400)
    expect(txAmount(jpy({ chargedAmount: { amount: -10000, currency: "XYZ" } }), {})).toBe(0)
    expect(toIls(-100, "ILS")).toBe(-100)
  })
})

describe("withoutSupersededPending", () => {
  const tx = (id: string, status: string, date: string, orig: number, accountId = "amex"): FinancyTransaction => ({
    id,
    accountId,
    providerId: "americanExpress",
    status,
    amount: { chargedAmount: { amount: orig * 3.03 }, originalAmount: { amount: orig } },
    date: { transactionDate: date },
  })

  it("drops a PENDING item whose BOOKED twin (same account + original amount, ≤3 days apart) is in the same fetch", () => {
    const pending = tx("p", "PENDING", "2026-09-21", -100)
    const booked = tx("b", "BOOKED", "2026-09-22", -100)
    expect(withoutSupersededPending([pending, booked]).map((t) => t.id)).toEqual(["b"])
  })

  it("keeps a PENDING item with no twin, and never drops BOOKED items", () => {
    const items = [tx("p", "PENDING", "2026-09-21", -100), tx("other-account", "BOOKED", "2026-09-21", -100, "cal"), tx("other-amount", "BOOKED", "2026-09-21", -25), tx("too-old", "BOOKED", "2026-09-10", -100)]
    expect(withoutSupersededPending(items).map((t) => t.id)).toEqual(["p", "other-account", "other-amount", "too-old"])
  })
})
