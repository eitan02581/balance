"use client"

import { useState } from "react"

import type { Category } from "@/db/schema"
import { formatILS } from "@/lib/money"
import type { CategorySpend } from "@/lib/month"
import { cn } from "@/lib/utils"
import { CategorySheet } from "@/components/category-sheet"

function OverPill({ over, className }: { over: number; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full bg-[#fde8e6] px-2 py-0.5 text-[12px] font-bold text-[#a13a31]", className)}>חריגה {formatILS(over)}</span>
}

export type BarRow = { id: number | null; label: string; emoji: string; spent: number; median: number; target: number | null; state: CategorySpend["state"]; note?: string }

/**
 * Ranked bars: where the money went. Bar length = spent, scaled to the biggest category, so it ranks spending.
 * The ceiling (target, or your median if no target) is a tick on the bar; anything past it is coral.
 * No "left to spend" amounts: a ceiling is an upper bound, not an allowance. Only overspending is called out. Click → sheet.
 */
export function CategoryBars({ month, rows, total, categories }: { month: string; rows: BarRow[]; total: number; categories: Category[] }) {
  const [openId, setOpenId] = useState<number | null | undefined>(undefined)
  const max = Math.max(1, ...rows.map((r) => r.spent))
  const current = rows.find((r) => r.id === openId)
  void total
  return (
    <>
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? <div className="text-sm text-muted-foreground">עדיין אין הוצאות החודש.</div> : null}
        {rows.map((r) => {
          const limit = r.target ?? (r.median > 0 ? r.median : null)
          const over = limit != null && r.spent > limit ? r.spent - limit : 0
          const within = over > 0 ? limit! : r.spent
          return (
            <button
              key={String(r.id)}
              type="button"
              onClick={() => setOpenId(r.id)}
              className="group -mx-2 cursor-pointer rounded-xl px-2 py-1.5 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <span className="shrink-0">{r.emoji}</span>
                  <span className="truncate">{r.label}</span>
                  {r.note ? <span className="hidden truncate text-xs font-medium text-muted-foreground sm:inline">· {r.note}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap tabular-nums">
                  {over > 0 ? <OverPill over={over} className="hidden sm:inline-flex" /> : null}
                  <b>{formatILS(r.spent)}</b>
                  {limit != null ? <span className="text-xs text-muted-foreground">תקרה {formatILS(limit)}</span> : null}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted">
                <div className="absolute inset-y-0 start-0 flex overflow-hidden rounded-full" style={{ width: `${(r.spent / max) * 100}%` }}>
                  <div className="h-full bg-green" style={{ width: `${(within / Math.max(1, r.spent)) * 100}%` }} />
                  {over > 0 ? <div className="h-full grow bg-coral" /> : null}
                </div>
                {over > 0 ? <div className="absolute -inset-y-0.5 w-0.5 rounded-full bg-foreground/50" style={{ insetInlineStart: `${(limit! / max) * 100}%` }} aria-hidden /> : null}
              </div>
              {over > 0 || r.note ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 sm:hidden">
                  {over > 0 ? <OverPill over={over} /> : <span />}
                  {r.note ? <span className="truncate text-xs text-muted-foreground">{r.note}</span> : null}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      <CategorySheet
        month={month}
        categoryId={openId ?? null}
        title={current ? `${current.emoji} ${current.label}` : ""}
        categories={categories}
        open={openId !== undefined}
        onOpenChange={(o) => !o && setOpenId(undefined)}
      />
    </>
  )
}
