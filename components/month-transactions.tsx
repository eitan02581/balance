"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Search } from "lucide-react"

import type { Account, Category, Transaction } from "@/db/schema"
import { formatILS } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { Card } from "@/components/cards"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CategorySelect, CountToggle, SELECT_CLS, TxMeta } from "@/components/transaction-row"

type Row = { tx: Transaction; account: Account | null; category: Category | null }

/** Searchable, editable list of the month's transactions. Not-counted rows are hidden unless asked for. */
export function TransactionList({ rows, categories }: { rows: Row[]; categories: Category[] }) {
  const [q, setQ] = useState("")
  const [showAll, setShowAll] = useState(false)
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => (showAll || !r.tx.isExcluded) && (!needle || `${r.tx.merchantName ?? ""} ${r.tx.description ?? ""} ${r.tx.details ?? ""} ${r.category?.nameHe ?? ""}`.toLowerCase().includes(needle)))
  }, [rows, q, showAll])
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] grow">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי עסק, תיאור, מוטב או קטגוריה" className={cn(SELECT_CLS, "w-full pe-9")} />
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4 accent-green" />
          הצג גם לא־נספר
        </label>
        <span className="text-[13px] text-muted-foreground">{visible.length} עסקאות</span>
      </div>
      <div className="mt-2 flex flex-col divide-y divide-border">
        {visible.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">לא נמצאו עסקאות.</div> : null}
        {visible.map(({ tx, account }) => {
          const notCounted = tx.isExcluded
          return (
            <div key={tx.id} className={cn("flex flex-col gap-2 py-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4", notCounted && "opacity-60")}>
              <div className="min-w-0 grow">
                <div className="flex items-start justify-between gap-3">
                  <div className="truncate font-bold">{tx.merchantName || tx.description || "—"}</div>
                  <div className={cn("shrink-0 font-black tabular-nums lg:hidden", tx.amount > 0 && "text-green", notCounted && "line-through")}>{formatILS(tx.amount)}</div>
                </div>
                <TxMeta tx={tx} source={account ? accountLabel(account) : tx.providerId} />
              </div>
              <div className="flex shrink-0 items-center gap-2 lg:w-[420px] lg:justify-end">
                <div className={cn("hidden w-20 text-end font-black tabular-nums lg:block", tx.amount > 0 && "text-green", notCounted && "line-through")}>{formatILS(tx.amount)}</div>
                <CategorySelect tx={tx} categories={categories} />
                <CountToggle tx={tx} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/** Every transaction of the month, editable in place. Collapsed by default; search filters as you type. */
export function MonthTransactions({ rows, categories, monthLabel }: { rows: Row[]; categories: Category[]; monthLabel: string }) {
  const [open, setOpen] = useState(false)
  const spending = rows.filter((r) => !r.tx.isExcluded)
  return (
    <Card className="p-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-start">
          <div>
            <div className="font-extrabold">כל העסקאות של {monthLabel}</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">{spending.length} הוצאות · שינוי קטגוריה כאן חל על כל העסקאות של אותו ספק</div>
          </div>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TransactionList rows={rows} categories={categories} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
