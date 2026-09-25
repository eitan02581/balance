import { describe, expect, it } from "vitest"

import { computeGym, weekStart } from "@/lib/gym"

const ev = (id: number, kind: "checkin" | "spend", date: string, amount: number) => ({ id, kind, date, amount, note: null })

describe("gym", () => {
  it("weekStart is the Sunday", () => {
    expect(weekStart("2026-09-22")).toBe("2026-09-20") // Tuesday → Sunday
    expect(weekStart("2026-09-20")).toBe("2026-09-20")
  })
  it("balance, streak, milestones", () => {
    const events = [
      ev(1, "checkin", "2026-09-06", 50), ev(2, "checkin", "2026-09-08", 50), ev(3, "checkin", "2026-09-10", 50), // week of 9/6: 3 ✓
      ev(4, "checkin", "2026-09-13", 50), ev(5, "checkin", "2026-09-15", 50), ev(6, "checkin", "2026-09-17", 50), // week of 9/13: 3 ✓
      ev(7, "checkin", "2026-09-21", 50), // current week: 1
      ev(8, "spend", "2026-09-18", -120),
    ]
    const g = computeGym(events, { rewardPerVisit: 50, weeklyGoal: 3 }, "2026-09-22")
    expect(g.earned).toBe(350)
    expect(g.spent).toBe(120)
    expect(g.balance).toBe(230)
    expect(g.streak).toBe(2) // current week not yet at goal → counts completed weeks
    expect(g.thisWeekVisits).toBe(1)
    expect(g.totalVisits).toBe(7)
    expect(g.nextMilestone).toBe(10)
    expect(g.milestonesReached).toEqual([5])
    expect(g.todayChecked).toBe(false)
    expect(g.calendar.filter((d) => d.checked).length).toBe(7)
  })
})
