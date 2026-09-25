import { describe, expect, it } from "vitest"

import { canCloseMonth, computeMonth, grocerySplit, nextMilestone, streak, type MonthTx } from "@/lib/month"

const cats = [
  { id: 1, slug: "eating-out", nameHe: "אוכל בחוץ", emoji: "🍽️", kind: "expense", monthlyTarget: 1000 },
  { id: 2, slug: "car", nameHe: "רכב", emoji: "🚗", kind: "expense", monthlyTarget: null },
  { id: 10, slug: "income", nameHe: "הכנסה", emoji: "💰", kind: "income", monthlyTarget: null },
]
const t = (p: Partial<MonthTx>): MonthTx => ({ amount: -100, isExcluded: false, accountType: "CARD", balanceCategoryId: 1, needsReview: false, ...p })

describe("computeMonth", () => {
  it("sums debits, subtracts refunds, ignores excluded rows", () => {
    const s = computeMonth({
      month: "2026-09",
      spendingTarget: 14800,
      savingsTarget: 5000,
      today: "2026-09-19",
      categories: cats,
      txs: [
        t({ amount: -600 }),
        t({ amount: -300 }),
        t({ amount: 50 }), // refund
        t({ amount: -4500, accountType: "CHECKING", isExcluded: true, balanceCategoryId: null }), // card charge
        t({ amount: -200, balanceCategoryId: 2 }),
        t({ amount: -80, balanceCategoryId: null, needsReview: true }),
      ],
    })
    expect(s.spent).toBe(1130)
    expect(s.remaining).toBe(13670)
    expect(s.bonus).toBe(13670)
    expect(s.expectedSavings).toBe(18670)
    expect(s.daysLeft).toBe(12)
    expect(s.needsReviewCount).toBe(1)
    expect(s.uncategorised).toBe(80)
    expect(s.categories.map((c) => [c.slug, c.spent, c.state])).toEqual([
      ["eating-out", 850, "warn"],
      ["car", 200, "none"],
    ])
  })

  it("reports negative remaining when over target", () => {
    const s = computeMonth({ month: "2026-09", spendingTarget: 100, savingsTarget: 0, categories: cats, txs: [t({ amount: -150 })] })
    expect(s.remaining).toBe(-50)
    expect(s.progressPct).toBe(100)
  })
})

describe("streak / close / milestones", () => {
  it("counts consecutive positive months from the latest", () => {
    expect(streak([{ month: "2026-05", surplus: 0 }, { month: "2026-06", surplus: 100 }, { month: "2026-07", surplus: 5 }, { month: "2026-08", surplus: 900 }])).toBe(3)
    expect(streak([{ month: "2026-08", surplus: -10 }, { month: "2026-07", surplus: 5 }])).toBe(0)
    expect(streak([])).toBe(0)
  })
  it("allows closing past months, current month only from the 28th", () => {
    expect(canCloseMonth("2026-08", "2026-09-02")).toBe(true)
    expect(canCloseMonth("2026-09", "2026-09-27")).toBe(false)
    expect(canCloseMonth("2026-09", "2026-09-28")).toBe(true)
    expect(canCloseMonth("2026-10", "2026-09-28")).toBe(false)
  })
  it("finds the next milestone", () => {
    expect(nextMilestone(12400, 20000)).toEqual({ pct: 75, amountLeft: 2600 })
    expect(nextMilestone(20000, 20000)).toBeNull()
  })
})

describe("grocerySplit", () => {
  it("separates main shops (≥₪300) from top-ups and ignores refunds/excluded", () => {
    const r = grocerySplit([{ amount: -724 }, { amount: -300 }, { amount: -133 }, { amount: -15 }, { amount: 40 }, { amount: -500, isExcluded: true }])
    expect(r.main).toEqual({ n: 2, total: 1024 })
    expect(r.additions).toEqual({ n: 2, total: 148 })
  })
})
