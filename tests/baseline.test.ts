import { describe, expect, it } from "vitest"

import { baselineMonths, computeBaseline, median } from "@/lib/baseline"

describe("baseline", () => {
  it("median handles odd/even/empty", () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBe(0)
  })
  it("uses full months of the current year, else last 6", () => {
    expect(baselineMonths("2026-09")).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"])
    expect(baselineMonths("2026-02")).toEqual(["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"])
  })
  it("counts missing months as zero and ignores months outside the window", () => {
    const b = computeBaseline(
      [
        { month: "2026-01", categoryId: 1, spent: 100 },
        { month: "2026-02", categoryId: 1, spent: 300 },
        { month: "2026-03", categoryId: 2, spent: 50 },
        { month: "2026-09", categoryId: 1, spent: 999 },
      ],
      ["2026-01", "2026-02", "2026-03"],
    )
    expect(b.categories.get(1)).toEqual({ avg: 133.33, median: 100, min: 0, max: 300, months: 3 })
    expect(b.total).toMatchObject({ median: 100, max: 300 })
  })
})
