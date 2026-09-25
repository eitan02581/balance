import Link from "next/link"
import { notFound } from "next/navigation"

import { ActionForm } from "@/components/action-form"
import { Card } from "@/components/cards"
import { GoalForm } from "@/components/forms/goal-form"
import { GoalProgress } from "@/components/goal-card"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { archiveGoal, setDefaultGoal } from "@/lib/actions"
import { formatILS, monthKey, monthLabelHe, monthNameHe, pct } from "@/lib/money"
import { nextMilestone } from "@/lib/month"
import { getGoal, getMonthSummary, getPlan } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function GoalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ closed?: string }> }) {
  const { id } = await params
  const { closed } = await searchParams
  const data = await getGoal(Number(id))
  if (!data) notFound()
  const month = monthKey()
  const [plan, summary] = await Promise.all([getPlan(month), getMonthSummary(month)])
  const { goal, allocations } = data
  const isDefault = plan.defaultGoalId === goal.id
  const nm = nextMilestone(goal.currentAmount, goal.targetAmount)
  const justAllocated = closed ? allocations.find((a) => a.month === closed && a.source === "month_close") : null

  return (
    <>
      <PageHeader title={`${goal.emoji} ${goal.name}`} sub={isDefault ? "היעד שמקבל את העודף החודשי." : undefined}>
        {!isDefault ? (
          <ActionForm action={setDefaultGoal.bind(null, month, goal.id)} success="זה עכשיו היעד לעודף החודשי ✓">
            <Button type="submit" variant="outline" className="rounded-xl font-bold">
              הפוך ליעד ברירת המחדל
            </Button>
          </ActionForm>
        ) : null}
      </PageHeader>

      {justAllocated ? (
        <div className="mb-4 rounded-3xl border border-[#d9ebe0] bg-soft p-6 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 text-2xl font-black text-green-deep">+{formatILS(justAllocated.amount)} נוספו ל{goal.name}</div>
          <div className="mt-1 text-sm text-[#3f5a49]">{monthLabelHe(justAllocated.month)} נסגר. כל הכבוד לכם.</div>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <GoalProgress goal={goal} projected={isDefault && summary.bonus > 0 ? goal.currentAmount + summary.bonus : undefined} big />
          {nm ? (
            <div className="mt-4 rounded-2xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">
              <div>
                <b>אבן הדרך הבאה: {nm.pct}%</b> ({formatILS((nm.pct / 100) * goal.targetAmount)}). חסרים {formatILS(nm.amountLeft)}.
              </div>
              {isDefault && summary.bonus > 0 ? (
                <div className="mt-1 text-muted-foreground">
                  אם {monthNameHe(month)} ייסגר עם הבונוס של היום ({formatILS(summary.bonus)}), היעד יעמוד על {formatILS(goal.currentAmount + summary.bonus)} ({pct(goal.currentAmount + summary.bonus, goal.targetAmount)}%)
                  {summary.bonus >= nm.amountLeft ? `, ותעברו את ${nm.pct}% 🎉` : `. יישארו ${formatILS(nm.amountLeft - summary.bonus)} ל־${nm.pct}%`}.
                </div>
              ) : isDefault ? (
                <div className="mt-1 text-muted-foreground">החודש עדיין אין בונוס, אז היעד לא יזוז בסגירה הקרובה.</div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm font-bold text-green">הגעתם ליעד 🎉</p>
          )}
        </Card>
        <Card>
          <div className="font-extrabold">הקצאות ליעד</div>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {allocations.length === 0 ? <div className="py-3 text-sm text-muted-foreground">עדיין לא הוקצה כלום. סגרו חודש עם עודף.</div> : null}
            {allocations.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  {monthLabelHe(a.month)}
                  <span className="text-muted-foreground"> · {a.source === "month_close" ? "סגירת חודש" : "ידני"}</span>
                </span>
                <b className="text-green">+{formatILS(a.amount)}</b>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <SectionTitle title="עריכה" />
      <Card className="max-w-xl">
        <GoalForm goal={goal} />
        <form action={archiveGoal.bind(null, goal.id)} className="mt-6 border-t border-border pt-4">
          <button type="submit" className="text-sm text-muted-foreground underline hover:text-destructive">
            העברה לארכיון
          </button>
        </form>
      </Card>
      <p className="mt-4 text-sm">
        <Link href="/goals" className="text-muted-foreground underline">
          חזרה לכל היעדים
        </Link>
      </p>
    </>
  )
}
