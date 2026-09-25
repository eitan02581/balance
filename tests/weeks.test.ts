import { describe, expect, it } from "vitest"

import { weeklyBreakdown, weeksOfMonth } from "@/lib/weeks"

describe("weeks", () => {
  it("splits September 2026 into Sunday-based weeks", () => {
    // 2026-09-01 is a Tuesday
    expect(weeksOfMonth("2026-09").map((w) => [w.from.slice(8), w.to.slice(8), w.days])).toEqual([
      ["01", "05", 5],
      ["06", "12", 7],
      ["13", "19", 7],
      ["20", "26", 7],
      ["27", "30", 4],
    ])
  })
  it("computes spend, expected share and on-track per week", () => {
    const rows = [
      { transactionDate: "2026-09-02", amount: -100 },
      { transactionDate: "2026-09-08", amount: -900 },
      { transactionDate: "2026-09-10", amount: 50 },
    ]
    const w = weeklyBreakdown(rows, "2026-09", 3000, "2026-09-22")
    expect(w[0]).toMatchObject({ spent: 100, expected: 500, status: "past", onTrack: true })
    expect(w[1]).toMatchObject({ spent: 850, expected: 700, status: "past", onTrack: false })
    expect(w[3]).toMatchObject({ spent: 0, status: "current", onTrack: true })
    expect(w[4]).toMatchObject({ status: "future", onTrack: null })
  })
})
