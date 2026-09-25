import Link from "next/link"

import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { SELECT_CLS } from "@/components/transaction-row"
import { Button } from "@/components/ui/button"
import { closeMonth } from "@/lib/actions"
import { canCloseMonth } from "@/lib/month"
import { addMonths, formatILS, monthKey, monthLabelHe, pct } from "@/lib/money"
import { getGoals, getMonthClose, getMonthSummary, getPlan } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function MonthClosePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams
  const current = monthKey()
  const prev = addMonths(current, -1)
  const prevClosed = await getMonthClose(prev)
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : prevClosed ? current : prev
  const [summary, plan, goalsList, existing] = await Promise.all([getMonthSummary(month), getPlan(month), getGoals(), getMonthClose(month)])
  const defaultGoal = goalsList.find((g) => g.id === plan.defaultGoalId) ?? goalsList[0] ?? null
  const surplus = summary.remaining
  const allowed = canCloseMonth(month)

  if (existing) {
    return (
      <>
        <PageHeader title={`${monthLabelHe(month)} כבר נסגר`} />
        <Card>
          <p className="text-sm text-muted-foreground">
            עודף של {formatILS(existing.surplus, { sign: true })} נרשם ב־{existing.closedAt.toLocaleDateString("he-IL")}.{" "}
            <Link href="/history" className="underline">
              להיסטוריה
            </Link>
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title={`סגירת ${monthLabelHe(month)}`} sub="רגע קטן של סיכום. הכסף שלא הוצאתם מקבל כתובת." />
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className={cn("rounded-3xl p-8 text-center", surplus > 0 ? "border border-[#d9ebe0] bg-soft" : "bg-card shadow-card")}>
          {surplus > 0 ? (
            <>
              <div className="text-sm font-bold text-green-deep">חודש מצוין 🎉</div>
              <div className="mt-2 text-[52px] font-black leading-none text-green">{formatILS(surplus, { sign: true })}</div>
              <div className="mt-2 text-sm text-[#3f5a49]">חסכתם מעבר למה שתכננתם.</div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-muted-foreground">החודש נסגר בלי עודף</div>
              <div className="mt-2 text-[44px] font-black leading-none">{formatILS(surplus)}</div>
              <div className="mt-2 text-sm text-muted-foreground">זה קורה. החודש הבא מתחיל מאפס, בלי חובות ליעד.</div>
            </>
          )}
        </div>

        <section className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">יעד הוצאות</div>
            <div className="mt-1 text-lg font-black">{formatILS(summary.spendingTarget)}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">הוצאות בפועל</div>
            <div className="mt-1 text-lg font-black">{formatILS(summary.spent)}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">הפרש</div>
            <div className={cn("mt-1 text-lg font-black", surplus > 0 ? "text-green" : "text-destructive")}>{formatILS(surplus, { sign: true })}</div>
          </Card>
        </section>

        {summary.needsReviewCount > 0 ? (
          <div className="rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">
            יש {summary.needsReviewCount} עסקאות לבדיקה בחודש הזה. כדאי{" "}
            <Link href="/review" className="font-bold underline">
              לסווג אותן
            </Link>{" "}
            לפני הסגירה כדי שהמספר יהיה מדויק.
          </div>
        ) : null}

        <form action={closeMonth}>
          <input type="hidden" name="month" value={month} />
          <Card className="flex flex-col gap-4">
            {surplus > 0 ? (
              <>
                <div className="font-extrabold">לאן הולך העודף?</div>
                {goalsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    אין יעדים עדיין.{" "}
                    <Link href="/goals/new" className="underline">
                      צרו יעד
                    </Link>{" "}
                    או סגרו בלי הקצאה.
                  </p>
                ) : (
                  <select name="goalId" defaultValue={defaultGoal?.id ?? ""} className={SELECT_CLS}>
                    <option value="">בלי הקצאה</option>
                    {goalsList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.emoji} {g.name} · {formatILS(g.currentAmount)} / {formatILS(g.targetAmount)}
                      </option>
                    ))}
                  </select>
                )}
                {defaultGoal ? (
                  <div className="rounded-2xl bg-muted/60 p-4 text-sm">
                    <div className="flex justify-between">
                      <span>לפני</span>
                      <b>
                        {formatILS(defaultGoal.currentAmount)} / {formatILS(defaultGoal.targetAmount)} · {pct(defaultGoal.currentAmount, defaultGoal.targetAmount)}%
                      </b>
                    </div>
                    <div className="mt-1 flex justify-between text-green-deep">
                      <span>אחרי</span>
                      <b>
                        {formatILS(defaultGoal.currentAmount + surplus)} / {formatILS(defaultGoal.targetAmount)} · {pct(defaultGoal.currentAmount + surplus, defaultGoal.targetAmount)}%
                      </b>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={!allowed} className="rounded-xl font-bold">
                {surplus > 0 ? "אישור וסגירת החודש" : "סגירת החודש"}
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-xl">
                <Link href="/">לא עכשיו</Link>
              </Button>
              {!allowed ? <span className="text-[13px] text-muted-foreground">אפשר לסגור את החודש הנוכחי מה־28 בחודש.</span> : null}
            </div>
          </Card>
        </form>
      </div>
    </>
  )
}
