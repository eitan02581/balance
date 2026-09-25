"use client"

import { useEffect, useState, useTransition } from "react"

import type { Category } from "@/db/schema"
import { loadCategoryHistory } from "@/lib/actions"
import type { BaselineStat } from "@/lib/baseline"
import { formatILS, monthNameHe } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { ResponsivePanel } from "@/components/responsive-panel"
import { ListSkeleton } from "@/components/sheet-skeleton"
import { CategorySelect, CountToggle, TxMeta } from "@/components/transaction-row"

export type BaselineRow = { c: Category; b: BaselineStat; now: number }
type Rows = Awaited<ReturnType<typeof loadCategoryHistory>>

export function BaselineTable({ rows, months, currentMonth, total, categories }: { rows: BaselineRow[]; months: string[]; currentMonth: string; total: { median: number; avg: number; min: number; max: number; now: number }; categories: Category[] }) {
  const [open, setOpen] = useState<BaselineRow | null>(null)
  const [data, setData] = useState<Rows | null>(null)
  const [, start] = useTransition()
  const reload = (row = open) => row && start(async () => setData(await loadCategoryHistory(row.c.id, [...months, currentMonth])))
  useEffect(() => {
    if (open) {
      setData(null)
      reload(open)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.c.id])

  const byMonth = new Map<string, Rows>()
  for (const r of data ?? []) {
    if (!byMonth.has(r.tx.month)) byMonth.set(r.tx.month, [])
    byMonth.get(r.tx.month)!.push(r)
  }
  const monthOrder = [currentMonth, ...[...months].reverse()]

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="px-5 py-3 text-start font-semibold">קטגוריה</th>
            <th className="px-3 py-3 text-end font-semibold">חציון</th>
            <th className="hidden px-3 py-3 text-end font-semibold sm:table-cell">ממוצע</th>
            <th className="hidden px-3 py-3 text-end font-semibold md:table-cell">טווח</th>
            <th className="px-3 py-3 text-end font-semibold">{monthNameHe(currentMonth)}</th>
            <th className="px-5 py-3 text-end font-semibold">הפרש</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { c, b, now } = row
            const d = now - b.median
            return (
              <tr key={c.id} onClick={() => setOpen(row)} className="cursor-pointer border-t border-border transition-colors hover:bg-soft/40">
                <td className="px-5 py-3 font-semibold">
                  {c.emoji} {c.nameHe}
                  {c.monthlyTarget ? <span className="ms-2 text-xs font-medium text-muted-foreground">יעד {formatILS(c.monthlyTarget)}</span> : null}
                </td>
                <td className="px-3 py-3 text-end font-bold tabular-nums">{formatILS(b.median)}</td>
                <td className="hidden px-3 py-3 text-end tabular-nums sm:table-cell">{formatILS(b.avg)}</td>
                <td className="hidden px-3 py-3 text-end text-muted-foreground tabular-nums md:table-cell">
                  {formatILS(b.min)} – {formatILS(b.max)}
                </td>
                <td className="px-3 py-3 text-end tabular-nums">{formatILS(now)}</td>
                <td className={cn("px-5 py-3 text-end font-bold tabular-nums", d > 0 ? "text-destructive" : "text-green")}>{formatILS(d, { sign: true })}</td>
              </tr>
            )
          })}
          <tr className="border-t-2 border-border bg-muted/40 font-extrabold">
            <td className="px-5 py-3">סה״כ</td>
            <td className="px-3 py-3 text-end tabular-nums">{formatILS(total.median)}</td>
            <td className="hidden px-3 py-3 text-end tabular-nums sm:table-cell">{formatILS(total.avg)}</td>
            <td className="hidden px-3 py-3 text-end tabular-nums md:table-cell">
              {formatILS(total.min)} – {formatILS(total.max)}
            </td>
            <td className="px-3 py-3 text-end tabular-nums">{formatILS(total.now)}</td>
            <td className={cn("px-5 py-3 text-end tabular-nums", total.now - total.median > 0 ? "text-destructive" : "text-green")}>{formatILS(total.now - total.median, { sign: true })}</td>
          </tr>
        </tbody>
      </table>

      <ResponsivePanel
        open={open != null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? `${open.c.emoji} ${open.c.nameHe}` : ""}
        description={open ? `חציון ${formatILS(open.b.median)} · ממוצע ${formatILS(open.b.avg)} · לפי ${open.b.months} חודשים מלאים` : undefined}
      >
        {!data ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-5">
            {monthOrder.map((m) => {
              const list = (byMonth.get(m) ?? []).filter((r) => !r.tx.isExcluded)
              const sum = list.reduce((s, r) => s - r.tx.amount, 0)
              const isCurrent = m === currentMonth
              return (
                <div key={m}>
                  <div className={cn("sticky top-0 z-10 -mx-4 flex items-center justify-between bg-popover px-4 py-2 text-sm", isCurrent && "text-[#2c5ab0]")}>
                    <b>
                      {monthNameHe(m)}
                      {isCurrent ? " · עדיין לא הסתיים" : ""}
                    </b>
                    <span className="tabular-nums">
                      <b>{formatILS(sum)}</b> <span className="text-muted-foreground">· {list.length} עסקאות</span>
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <div className="py-2 text-[13px] text-muted-foreground">אין הוצאות בחודש הזה (נספר כ־0 בחציון).</div>
                  ) : (
                    <div className="flex flex-col divide-y divide-border">
                      {list.map(({ tx, account }) => (
                        <div key={tx.id} className="flex flex-col gap-2 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-bold">{tx.merchantName || tx.description || "—"}</div>
                              <TxMeta tx={tx} source={account ? accountLabel(account) : tx.providerId} />
                            </div>
                            <div className={cn("shrink-0 font-black tabular-nums", tx.amount > 0 && "text-green")}>{formatILS(tx.amount)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CategorySelect tx={tx} categories={categories} onSaved={() => reload()} />
                            <CountToggle tx={tx} onDone={() => reload()} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ResponsivePanel>
    </>
  )
}
