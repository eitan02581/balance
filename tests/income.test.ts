import { describe, expect, it } from "vitest"

import { summarizeIncome } from "@/lib/income"

const cats = [
  { id: 1, nameHe: "סופר", emoji: "🛒", kind: "expense" },
  { id: 10, nameHe: "הכנסה אחרת", emoji: "💰", kind: "income" },
  { id: 14, nameHe: "ביטוח לאומי", emoji: "🏛️", kind: "income" },
]

describe("summarizeIncome", () => {
  it("sums only income credits, grouped by bucket, biggest first", () => {
    const r = summarizeIncome(
      [
        { amount: 3000, isExcluded: true, exclusionReason: "income", balanceCategoryId: 14 },
        { amount: 7000, isExcluded: true, exclusionReason: "income", balanceCategoryId: 10 },
        { amount: 700, isExcluded: true, exclusionReason: "income", balanceCategoryId: 10 },
        { amount: 5000, isExcluded: true, exclusionReason: "internal_transfer", balanceCategoryId: null }, // not income
        { amount: -250, isExcluded: false, exclusionReason: null, balanceCategoryId: 1 }, // expense
        { amount: 120, isExcluded: false, exclusionReason: null, balanceCategoryId: 1 }, // card refund stays in its expense category
      ],
      cats,
    )
    expect(r.total).toBe(10700)
    expect(r.buckets.map((b) => [b.nameHe, b.amount, b.n])).toEqual([
      ["הכנסה אחרת", 7700, 2],
      ["ביטוח לאומי", 3000, 1],
    ])
  })

  it("keeps an income row whose category is missing under a generic bucket", () => {
    const r = summarizeIncome([{ amount: 50, isExcluded: true, exclusionReason: "income", balanceCategoryId: null }], cats)
    expect(r.buckets).toEqual([{ id: null, nameHe: "הכנסה", emoji: "💰", amount: 50, n: 1 }])
  })
})

import { isInvestment, sumInvested } from "@/lib/income"

describe("investments", () => {
  const checking = { role: "spending", accountType: "CHECKING" }
  const savingsAcc = { role: "savings", accountType: "CHECKING" }
  it("counts savings debits from spending accounts only", () => {
    const rows = [
      { tx: { amount: -1500, isExcluded: true, exclusionReason: "savings" }, account: checking }, // standing order to broker
      { tx: { amount: 1000, isExcluded: true, exclusionReason: "savings" }, account: checking }, // credit misfiled as savings: not an investment
      { tx: { amount: -300, isExcluded: true, exclusionReason: "savings" }, account: savingsAcc }, // inside the savings account: skip
      { tx: { amount: -200, isExcluded: false, exclusionReason: null }, account: checking }, // expense
      { tx: { amount: -50, isExcluded: true, exclusionReason: "savings" }, account: null }, // unknown account: count
    ]
    expect(rows.map((r) => isInvestment(r.tx, r.account))).toEqual([true, false, false, false, true])
    expect(sumInvested(rows)).toBe(1550)
  })
})
