import Link from "next/link"
import { Plus } from "lucide-react"

import { Card } from "@/components/cards"
import { GoalCard } from "@/components/goal-card"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { formatILS, monthKey } from "@/lib/money"
import { nextMilestone } from "@/lib/month"
import { getGoals, getMonthSummary, getPlan } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function GoalsPage() {
  const month = monthKey()
  const [list, plan, summary] = await Promise.all([getGoals(), getPlan(month), getMonthSummary(month)])
  const defaultGoal = list.find((g) => g.id === plan.defaultGoalId) ?? null
  const nm = defaultGoal ? nextMilestone(defaultGoal.currentAmount, defaultGoal.targetAmount) : null
  return (
    <>
      <PageHeader title="היעדים שלנו" sub="לאן הולך הכסף שלא הוצאנו.">
        <Button asChild size="lg" className="rounded-xl font-bold">
          <Link href="/goals/new">
            <Plus /> יעד חדש
          </Link>
        </Button>
      </PageHeader>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-4">
          {list.length === 0 ? (
            <Card className="text-sm text-muted-foreground">
              עדיין אין יעדים.{" "}
              <Link href="/goals/new" className="underline">
                צרו את הראשון
              </Link>
              .
            </Card>
          ) : null}
          {list.map((g) => (
            <GoalCard key={g.id} goal={g} isDefault={g.id === plan.defaultGoalId} bonus={summary.bonus} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <div className="font-extrabold">כלל ברירת המחדל</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {defaultGoal
                ? `כל עודף בסגירת החודש מתווסף אוטומטית ל${defaultGoal.name} ${defaultGoal.emoji}. אפשר לשנות בהגדרות.`
                : "עוד לא נבחר יעד לעודף. בחרו אחד בהגדרות."}
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-xl font-bold">
              <Link href="/settings">שינוי בהגדרות</Link>
            </Button>
          </Card>
          {defaultGoal && nm ? (
            <Card>
              <div className="font-extrabold">אבן הדרך הבאה</div>
              <p className="mt-1 text-sm text-muted-foreground">
                עוד {formatILS(nm.amountLeft)} עד {nm.pct}% מ{defaultGoal.name}.
                {summary.bonus > 0 ? ` הבונוס הנוכחי (${formatILS(summary.bonus)}) ${summary.bonus >= nm.amountLeft ? "יעבור את זה 🎉" : "מקרב אתכם לשם."}` : ""}
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </>
  )
}
