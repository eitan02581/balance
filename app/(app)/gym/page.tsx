import { Trophy } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { Card } from "@/components/cards"
import { GymCheckIn } from "@/components/gym-checkin"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gymSpend, gymUndo, saveGymSettings } from "@/lib/actions"
import { computeGym, MILESTONES } from "@/lib/gym"
import { dateLabelHe, formatILS, monthNameHe } from "@/lib/money"
import { getGym } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const DAY_HEADS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]

export default async function GymPage() {
  const { settings, events } = await getGym()
  const g = computeGym(events, settings)
  const firstDow = new Date(`${g.month}-01T00:00:00Z`).getUTCDay()
  const goalPct = Math.min(100, Math.round((g.thisWeekVisits / g.weeklyGoal) * 100))
  const spends = events.filter((e) => e.kind === "spend")
  const recentCheckins = events.filter((e) => e.kind === "checkin").slice(0, 8)

  return (
    <>
      <PageHeader title={settings.name} sub={`כל אימון = ${formatILS(settings.rewardPerVisit)} לפינוק. ${settings.weeklyGoal} אימונים בשבוע שומרים על הרצף.`} />

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-linear-135 from-hero-from to-hero-to p-6 text-white shadow-[0_10px_30px_rgba(25,42,31,0.12)] sm:p-7">
            <div className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-lime opacity-[0.14]" />
            <div className="text-[13px] font-bold text-white/75">זמין לפינוק</div>
            <div className="mt-2 text-[50px] font-black leading-none">{formatILS(g.balance)}</div>
            <div className="mt-2.5 text-sm text-white/80">
              הרווחתם {formatILS(g.earned)} ב־{g.totalVisits} אימונים · השתמשתם ב־{formatILS(g.spent)}
            </div>
            <div className="mt-5">
              <GymCheckIn todayChecked={g.todayChecked} reward={settings.rewardPerVisit} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <div className="text-[12px] font-bold text-muted-foreground">השבוע</div>
              <div className="mt-1 text-2xl font-black">
                {g.thisWeekVisits}
                <span className="text-sm font-semibold text-muted-foreground"> / {g.weeklyGoal}</span>
              </div>
              <div className="mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-green" style={{ width: `${goalPct}%` }} />
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-[12px] font-bold text-muted-foreground">רצף שבועות</div>
              <div className="mt-1 text-2xl font-black">🔥 {g.streak}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{g.streak > 0 ? "אל תשברו את זה" : "השבוע מתחילים"}</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-[12px] font-bold text-muted-foreground">{monthNameHe(g.month)}</div>
              <div className="mt-1 text-2xl font-black">{g.monthVisits}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">אימונים החודש</div>
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-extrabold">{monthNameHe(g.month)}</div>
              <div className="text-[12px] text-muted-foreground">כל ריבוע ירוק = {formatILS(settings.rewardPerVisit)}</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted-foreground">
              {DAY_HEADS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {g.calendar.map((d) => (
                <div
                  key={d.iso}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl text-sm font-bold",
                    d.checked ? "bg-green text-white" : d.future ? "bg-muted/40 text-muted-foreground/50" : "bg-muted text-muted-foreground",
                    d.today && !d.checked && "ring-2 ring-lime",
                  )}
                >
                  {d.checked ? "💪" : d.day}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2 font-extrabold">
              <Trophy className="size-5 text-amber-ink" /> אבני דרך
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {MILESTONES.map((m) => (
                <span key={m} className={cn("rounded-full px-3 py-1.5 text-sm font-bold", g.milestonesReached.includes(m) ? "bg-lime text-sidebar-dark" : "bg-muted text-muted-foreground")}>
                  {g.milestonesReached.includes(m) ? "🏅 " : ""}
                  {m} אימונים
                </span>
              ))}
            </div>
            {g.nextMilestone ? (
              <p className="mt-3 text-sm text-muted-foreground">
                עוד {g.nextMilestone - g.totalVisits} אימונים לאבן הדרך הבאה ({g.nextMilestone}).
              </p>
            ) : (
              <p className="mt-3 text-sm font-bold text-green">כל אבני הדרך הושגו. אגדה. 🏆</p>
            )}
          </Card>

          <Card>
            <div className="font-extrabold">פינוק מהיתרה</div>
            <p className="mt-1 text-[13px] text-muted-foreground">בגדים, נעליים, משהו כיף. יורד מהיתרה, בלי רגשות אשם.</p>
            <ActionForm action={gymSpend} success="נרשם. תיהנו ממנו 🛍️" reset className="mt-3 flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="amount" className="text-xs">
                  סכום (₪)
                </Label>
                <Input id="amount" name="amount" type="number" inputMode="numeric" min={1} max={Math.max(1, g.balance)} placeholder="150" required className="h-10 w-28" />
              </div>
              <div className="flex min-w-0 grow flex-col gap-1">
                <Label htmlFor="note" className="text-xs">
                  על מה
                </Label>
                <Input id="note" name="note" placeholder="נעלי ריצה חדשות" className="h-10" />
              </div>
              <Button type="submit" className="h-10 rounded-xl font-bold" disabled={g.balance <= 0}>
                נרשם
              </Button>
            </ActionForm>
            {spends.length > 0 ? (
              <div className="mt-3 flex flex-col divide-y divide-border text-sm">
                {spends.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {e.note || "פינוק"} <span className="text-xs text-muted-foreground">· {dateLabelHe(e.date)}</span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">{formatILS(e.amount)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="font-extrabold">אימונים אחרונים</div>
            <div className="mt-2 flex flex-col divide-y divide-border text-sm">
              {recentCheckins.length === 0 ? <div className="py-3 text-muted-foreground">עוד לא נרשם אימון. הכפתור הגדול מחכה.</div> : null}
              {recentCheckins.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    💪 {dateLabelHe(e.date)}
                    {e.note ? <span className="text-xs text-muted-foreground"> · {e.note}</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-green tabular-nums">{formatILS(e.amount, { sign: true })}</span>
                    <ActionForm action={gymUndo.bind(null, e.id)} success="האימון בוטל">
                      <button type="submit" className="text-[11px] text-muted-foreground underline hover:text-destructive">
                        בטל
                      </button>
                    </ActionForm>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="font-extrabold">הגדרות</div>
            <ActionForm action={saveGymSettings} success="ההגדרות נשמרו ✓" className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="name" className="text-xs">
                  שם העמוד
                </Label>
                <Input id="name" name="name" defaultValue={settings.name} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rewardPerVisit" className="text-xs">
                    בונוס לאימון (₪)
                  </Label>
                  <Input id="rewardPerVisit" name="rewardPerVisit" type="number" min={1} defaultValue={settings.rewardPerVisit} className="h-10" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="weeklyGoal" className="text-xs">
                    יעד שבועי (אימונים)
                  </Label>
                  <Input id="weeklyGoal" name="weeklyGoal" type="number" min={1} max={7} defaultValue={settings.weeklyGoal} className="h-10" />
                </div>
              </div>
              <Button type="submit" variant="outline" className="self-start rounded-xl font-bold">
                שמירה
              </Button>
            </ActionForm>
          </Card>
        </div>
      </section>
    </>
  )
}
