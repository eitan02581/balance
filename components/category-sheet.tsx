"use client"

import { useEffect, useState, useTransition } from "react"
import { EyeOff } from "lucide-react"

import type { Category } from "@/db/schema"
import { loadCategoryDetail } from "@/lib/actions"
import { formatILS, monthKey, monthNameHe, pct } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { Bar } from "@/components/bar"
import { ResponsivePanel } from "@/components/responsive-panel"
import { CategorySelect, CountToggle, TxMeta } from "@/components/transaction-row"
import { TrendChart, TrendLegend } from "@/components/trend-chart"
import { WeeklyBreakdown } from "@/components/weekly-breakdown"
import { SheetSkeleton } from "@/components/sheet-skeleton"
import { weeklyBreakdown } from "@/lib/weeks"
import { GROCERY_MAIN_THRESHOLD, grocerySplit } from "@/lib/month"
import { GroceryTag } from "@/components/grocery-tag"

type Detail = Awaited<ReturnType<typeof loadCategoryDetail>>

export function CategorySheet({ month, categoryId, title, categories, open, onOpenChange }: { month: string; categoryId: number | null; title: string; categories: Category[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [viewMonth, setViewMonth] = useState(month) // clicking a bar switches the list to that month; the chart stays put
  const [trend, setTrend] = useState<Detail["trend"]>([])
  const [baseline, setBaseline] = useState<Detail["baseline"] | null>(null) // fixed to the opened month; inspecting other months must not move it
  const [pending, start] = useTransition()
  const reload = (m = viewMonth) =>
    start(async () => {
      const d = await loadCategoryDetail(m, categoryId)
      setDetail(d)
      setTrend((prev) => (prev.length && m !== month ? prev : d.trend))
      setBaseline((prev) => (prev && m !== month ? prev : d.baseline))
    })
  useEffect(() => {
    if (!open) return
    setDetail(null)
    setTrend([])
    setBaseline(null)
    setViewMonth(month)
    reload(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, month, categoryId])

  const base = baseline ?? detail?.baseline ?? null
  const thisMonth = detail?.trend.find((t) => t.month === viewMonth)?.spent ?? 0
  const med = base?.median ?? 0
  const delta = thisMonth - med
  const target = detail?.category?.monthlyTarget ?? null
  const isCurrent = viewMonth === monthKey()

  return (
    <ResponsivePanel open={open} onOpenChange={onOpenChange} title={title} description="לחיצה על עמודה בגרף מציגה את העסקאות של אותו חודש · שינוי קטגוריה חל על כל העסקאות של הספק">
      {!detail ? (
        <SheetSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-sky/25 p-3">
              <div className="text-[11px] font-bold text-muted-foreground">{isCurrent ? "החודש" : monthNameHe(viewMonth)}</div>
              <div className="text-xl font-black">{formatILS(thisMonth)}</div>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <div className="text-[11px] font-bold text-muted-foreground">חציון {base?.months ?? 0} חודשים</div>
              <div className="text-xl font-black">{formatILS(med)}</div>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <div className="text-[11px] font-bold text-muted-foreground">ממוצע {base?.months ?? 0} חודשים</div>
              <div className="text-xl font-black">{formatILS(base?.avg ?? 0)}</div>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <div className="text-[11px] font-bold text-muted-foreground">לעומת הרגיל</div>
              <div className={cn("text-xl font-black", delta > 0 ? "text-destructive" : "text-green")}>{formatILS(delta, { sign: true })}</div>
            </div>
          </div>
          {target ? (
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>יעד חודשי</span>
                <b>
                  {formatILS(thisMonth)} / {formatILS(target)} · {pct(thisMonth, target)}%
                </b>
              </div>
              <Bar pct={pct(thisMonth, target)} state={thisMonth / target >= 0.95 ? "hot" : thisMonth / target >= 0.8 ? "warn" : "ok"} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <TrendChart data={trend.length ? trend : detail.trend} median={med} current={viewMonth} onSelect={(m) => { setViewMonth(m); reload(m) }} />
            <TrendLegend median={med} partial={isCurrent} />
          </div>
          {detail.category?.slug === "groceries" ? (
            <GrocerySummary split={grocerySplit(detail.transactions.map((r) => r.tx))} />
          ) : null}
          <WeeklyBreakdown
            weeks={weeklyBreakdown(detail.transactions.filter((r) => !r.tx.isExcluded).map((r) => r.tx), viewMonth, target ?? (med > 0 ? med : null))}
            transactions={detail.transactions}
            defaultOpen={false}
          />
          <div>
            <div className="mb-2 text-sm font-extrabold">
              {detail.transactions.length} עסקאות · {monthNameHe(viewMonth)}
              {pending ? <span className="ms-2 text-xs font-medium text-muted-foreground">טוען…</span> : null}
            </div>
            <div className="flex flex-col divide-y divide-border">
              {detail.transactions.map(({ tx, account }) => {
                const notCounted = tx.isExcluded && tx.exclusionReason === "manual"
                return (
                  <div key={tx.id} className={cn("flex flex-col gap-2 py-3", notCounted && "opacity-60")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {tx.merchantName || tx.description || "—"}
                          {notCounted ? <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">לא נספר</span> : null}
                          {detail.category?.slug === "groceries" ? <GroceryTag amount={tx.amount} className="ms-2" /> : null}
                        </div>
                        <TxMeta tx={tx} source={account ? accountLabel(account) : tx.providerId} />
                      </div>
                      <div className={cn("shrink-0 font-black tabular-nums", tx.amount > 0 && "text-green", notCounted && "line-through")}>{formatILS(tx.amount)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CategorySelect tx={tx} categories={categories} onSaved={() => reload()} />
                      <CountToggle tx={tx} onDone={() => reload()} />
                    </div>
                  </div>
                )
              })}
              {detail.transactions.length === 0 ? <div className="py-4 text-sm text-muted-foreground">אין עסקאות בקטגוריה הזאת החודש.</div> : null}
            </div>
          </div>
        </div>
      )}
    </ResponsivePanel>
  )
}

/** Small helper used by the bars list: the "not counted" affordance explained once. */
export function NotCountedHint() {
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <EyeOff className="size-3.5" /> "לא נספר" מוציא עסקה מכל החישובים, והיא נשארת גלויה בכרטיס "לא נספר" למטה.
    </div>
  )
}


function GrocerySummary({ split }: { split: ReturnType<typeof grocerySplit> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-green/30 bg-soft/60 p-3">
        <div className="flex items-center gap-1 text-[11px] font-bold text-green-deep">🛒 קניות גדולות (₪{GROCERY_MAIN_THRESHOLD}+)</div>
        <div className="text-xl font-black">{formatILS(split.main.total)}</div>
        <div className="text-[12px] text-muted-foreground">{split.main.n} קניות</div>
      </div>
      <div className="rounded-2xl border border-amber/60 bg-amber-soft/60 p-3">
        <div className="text-[11px] font-bold text-amber-ink">+ השלמות</div>
        <div className="text-xl font-black">{formatILS(split.additions.total)}</div>
        <div className="text-[12px] text-muted-foreground">{split.additions.n} קניות קטנות</div>
      </div>
    </div>
  )
}
