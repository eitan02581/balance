"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import type { Account, Transaction } from "@/db/schema"
import { dateLabelHe, formatILS } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import type { WeekRow } from "@/lib/weeks"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

type TxRow = { tx: Transaction; account: Account | null }

function dayRange(w: WeekRow) {
  return `${Number(w.from.slice(8))}–${Number(w.to.slice(8))}`
}

/** Riseup-style week table: spent vs the target's share for that week, on-track dot, current week highlighted, expandable. */
export function WeeklyBreakdown({ weeks, transactions, defaultOpen = true, title = "פירוט שבועי" }: { weeks: WeekRow[]; transactions?: TxRow[]; defaultOpen?: boolean; title?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const [expanded, setExpanded] = useState<number | null>(null)
  const hasLimit = weeks.some((w) => w.expected > 0)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-start">
        <span className="font-extrabold">{title}</span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_44px] items-center gap-2 bg-muted/50 px-3 py-2 text-[12px] font-bold text-muted-foreground">
            <span>שבוע</span>
            <span className="text-end">יצא</span>
            <span className="text-end">{hasLimit ? "צפוי לצאת" : ""}</span>
            <span />
          </div>
          {weeks.map((w) => {
            const rows = transactions?.filter((r) => r.tx.transactionDate >= w.from && r.tx.transactionDate <= w.to && !r.tx.isExcluded) ?? []
            const canExpand = transactions != null && rows.length > 0
            const isOpen = expanded === w.index
            return (
              <div key={w.index} className={cn("border-t border-border", w.status === "future" && "opacity-50")}>
                <button
                  type="button"
                  disabled={!canExpand}
                  onClick={() => setExpanded(isOpen ? null : w.index)}
                  className={cn("grid w-full grid-cols-[1.2fr_1fr_1fr_44px] items-center gap-2 px-3 py-2.5 text-start text-sm", canExpand && "hover:bg-muted/40")}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 font-bold", w.status === "current" ? "bg-sky text-[#0f2a55]" : "text-foreground")}>שבוע {w.index}</span>
                    <span className="text-[11px] text-muted-foreground">{dayRange(w)}</span>
                  </span>
                  <span className={cn("text-end font-bold tabular-nums", w.status === "current" && "text-[#2c5ab0]")}>{formatILS(w.spent)}</span>
                  <span className="text-end tabular-nums text-muted-foreground">{hasLimit ? formatILS(w.expected) : ""}</span>
                  <span className="flex items-center justify-end gap-1.5">
                    {w.onTrack != null ? <span className={cn("size-2 rounded-full", w.onTrack ? "bg-green" : "bg-coral")} /> : null}
                    {canExpand ? <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} /> : <span className="size-4" />}
                  </span>
                </button>
                {isOpen ? (
                  <div className="flex flex-col divide-y divide-border bg-muted/20 px-3">
                    {rows.map(({ tx, account }) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{tx.merchantName || tx.description || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {dateLabelHe(tx.transactionDate)} · {account ? accountLabel(account) : tx.providerId}
                          </div>
                        </div>
                        <span className={cn("shrink-0 font-bold tabular-nums", tx.amount > 0 && "text-green")}>{formatILS(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
