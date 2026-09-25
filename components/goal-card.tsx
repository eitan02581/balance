import Link from "next/link"

import type { Goal } from "@/db/schema"
import { formatILS, pct } from "@/lib/money"
import { InfoPopover } from "@/components/info-popover"
import { MILESTONES } from "@/lib/month"
import { cn } from "@/lib/utils"

export function GoalProgress({ goal, projected, big = false }: { goal: Goal; projected?: number; big?: boolean }) {
  const p = pct(goal.currentAmount, goal.targetAmount)
  const pp = projected != null ? pct(projected, goal.targetAmount) : null
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("font-black", big ? "text-[40px] leading-none" : "text-2xl")}>{formatILS(goal.currentAmount)}</div>
          <div className="text-sm text-muted-foreground">מתוך {formatILS(goal.targetAmount)} · הוקצה עד היום</div>
        </div>
        <div className="flex items-start gap-2">
          <div className={cn("font-black text-green", big ? "text-4xl" : "text-2xl")}>{p}%</div>
          {big ? (
            <InfoPopover title="איך היעד מתמלא">
              בסוף כל חודש, מה שלא הוצאתם מתחת ליעד ההוצאות הוא הבונוס. בסגירת החודש הבונוס "נצבע" ליעד הזה ומתווסף לסכום.
              <br />
              <br />
              <b>הפס הכהה</b> = מה שכבר הוקצה. <b>הפס התכלת</b> = לאן תגיעו אם החודש הנוכחי ייסגר עם הבונוס של היום. הכסף עצמו נשאר איפה שהוא; Balance רק זוכר בשבילכם למה הוא מיועד.
            </InfoPopover>
          ) : null}
        </div>
      </div>
      <div className="relative mt-3 h-3.5 overflow-hidden rounded-full bg-muted">
        {pp != null && pp > p ? <div className="absolute inset-y-0 start-0 rounded-full bg-sky/60" style={{ width: `${pp}%` }} /> : null}
        <div className="absolute inset-y-0 start-0 rounded-full bg-sky" style={{ width: `${p}%` }} />
      </div>
      {pp != null && pp > p ? (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-2 w-4 rounded-full bg-sky/60" /> תחזית אם החודש ייסגר עכשיו: {formatILS(projected!)} ({pp}%)
        </div>
      ) : null}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {MILESTONES.map((m) => (
          <span key={m} className={cn(p >= m && "font-bold text-green")}>
            {p >= m ? "✓ " : ""}
            {m}%
          </span>
        ))}
      </div>
    </div>
  )
}

export function GoalCard({ goal, isDefault, bonus }: { goal: Goal; isDefault: boolean; bonus: number }) {
  return (
    <Link href={`/goals/${goal.id}`} className="block rounded-3xl border border-[#edf0ee] bg-card p-6 shadow-card transition-colors hover:bg-soft/30">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="text-2xl">{goal.emoji}</span> {goal.name}
        </div>
        {isDefault ? <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-green-deep">ברירת המחדל לעודף</span> : null}
      </div>
      <GoalProgress goal={goal} projected={isDefault && bonus > 0 ? goal.currentAmount + bonus : undefined} />
      {isDefault && bonus > 0 ? (
        <div className="mt-3 text-[13px] text-muted-foreground">
          אם החודש ייסגר עכשיו: {formatILS(goal.currentAmount + bonus)} ({pct(goal.currentAmount + bonus, goal.targetAmount)}%)
        </div>
      ) : null}
    </Link>
  )
}
