import { addDays, daysInMonth, monthKey, todayIL } from "@/lib/money"
import { round2 } from "@/lib/month"

export type GymEvent = { id: number; kind: string; date: string; amount: number; note: string | null }
export type GymSettings = { rewardPerVisit: number; weeklyGoal: number }

export const MILESTONES = [5, 10, 25, 50, 100, 200]

/** Sunday of the week containing `iso`. */
export function weekStart(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return addDays(iso, -d.getUTCDay())
}

export function computeGym(events: GymEvent[], settings: GymSettings, today = todayIL()) {
  const checkins = events.filter((e) => e.kind === "checkin")
  const spends = events.filter((e) => e.kind === "spend")
  const earned = round2(checkins.reduce((s, e) => s + e.amount, 0))
  const spent = round2(spends.reduce((s, e) => s - e.amount, 0))
  const month = monthKey(today)
  const visitDates = new Set(checkins.map((e) => e.date))

  // weekly streak: consecutive weeks (ending with the current or last week) that hit the goal
  const perWeek = new Map<string, number>()
  for (const d of visitDates) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1)
  const thisWeek = weekStart(today)
  const thisWeekVisits = perWeek.get(thisWeek) ?? 0
  let streak = 0
  let w = thisWeekVisits >= settings.weeklyGoal ? thisWeek : addDays(thisWeek, -7)
  while ((perWeek.get(w) ?? 0) >= settings.weeklyGoal) {
    streak++
    w = addDays(w, -7)
  }

  const total = visitDates.size
  const nextMilestone = MILESTONES.find((m) => m > total) ?? null
  const calendar = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const iso = `${month}-${String(i + 1).padStart(2, "0")}`
    return { iso, day: i + 1, checked: visitDates.has(iso), future: iso > today, today: iso === today }
  })

  return {
    balance: round2(earned - spent),
    earned,
    spent,
    totalVisits: total,
    monthVisits: checkins.filter((e) => e.date.startsWith(month)).length,
    thisWeekVisits,
    weeklyGoal: settings.weeklyGoal,
    streak,
    todayChecked: visitDates.has(today),
    nextMilestone,
    milestonesReached: MILESTONES.filter((m) => total >= m),
    calendar,
    month,
  }
}
