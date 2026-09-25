"use client"

import { useState } from "react"

import type { Category } from "@/db/schema"
import { formatILS } from "@/lib/money"
import type { CategorySpend } from "@/lib/month"
import { cn } from "@/lib/utils"
import { Bar } from "@/components/bar"
import { CategorySheet } from "@/components/category-sheet"

/** Expenses-page category grid; each card opens the same category sheet as the home bars. */
export function CategoryCards({ month, rows, categories }: { month: string; rows: CategorySpend[]; categories: Category[] }) {
  const [openId, setOpenId] = useState<number | undefined>(undefined)
  const current = rows.find((r) => r.id === openId)
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? <div className="rounded-3xl bg-card p-6 text-sm text-muted-foreground shadow-card">אין עדיין הוצאות מסווגות בחודש הזה.</div> : null}
        {rows.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className={cn(
              "rounded-3xl border border-[#edf0ee] bg-card p-5 text-start shadow-card transition-colors hover:bg-soft/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold">
                {c.emoji} {c.nameHe}
              </div>
              {c.monthlyTarget ? (
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", c.monthlyTarget - c.spent >= 0 ? "bg-soft text-green-deep" : "bg-[#fde8e6] text-[#a13a31]")}>
                  {c.monthlyTarget - c.spent >= 0 ? `נשאר ${formatILS(c.monthlyTarget - c.spent)}` : `חריגה ${formatILS(c.spent - c.monthlyTarget)}`}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-xl font-black">
              {formatILS(c.spent)}
              {c.monthlyTarget ? <span className="text-sm font-medium text-muted-foreground"> / {formatILS(c.monthlyTarget)}</span> : null}
            </div>
            <Bar pct={c.monthlyTarget ? c.pctUsed! : 0} state={c.state} className="mt-3" />
          </button>
        ))}
      </section>
      <CategorySheet month={month} categoryId={openId ?? null} title={current ? `${current.emoji} ${current.nameHe}` : ""} categories={categories} open={openId !== undefined} onOpenChange={(o) => !o && setOpenId(undefined)} />
    </>
  )
}
