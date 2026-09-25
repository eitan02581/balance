import { describe, expect, it } from "vitest"

import { txAmount, withoutSupersededPending, type FinancyTransaction } from "@/lib/financy/types"

describe("txAmount", () => {
  it("uses the charged amount, and treats an empty charged amount as ₪0 (full discount)", () => {
    expect(txAmount({ id: "a", accountId: "x", providerId: "max", amount: { chargedAmount: { amount: -17.9 }, originalAmount: { amount: -15.17 } } })).toBe(-17.9)
    expect(txAmount({ id: "b", accountId: "x", providerId: "isracard", amount: { chargedAmount: { amount: "" as unknown as number }, originalAmount: { amount: -17.9 } } })).toBe(0)
    expect(txAmount({ id: "c", accountId: "x", providerId: "cal", amount: { originalAmount: { amount: -50 } } })).toBe(-50)
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
