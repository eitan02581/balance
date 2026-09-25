"use client"

import { useEffect, useState, useTransition } from "react"
import { ArrowLeft } from "lucide-react"

import type { Category } from "@/db/schema"
import { loadInsightTransactions } from "@/lib/actions"
import type { InsightFilter } from "@/lib/insights"
import { formatILS } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { ResponsivePanel } from "@/components/responsive-panel"
import { ListSkeleton } from "@/components/sheet-skeleton"
import { CategorySelect, CountToggle, TxMeta } from "@/components/transaction-row"

type Rows = Awaited<ReturnType<typeof loadInsightTransactions>>

export function InsightSheet({ title, filter, categories }: { title: string; filter: InsightFilter; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Rows | null>(null)
  const [, start] = useTransition()
  const reload = () => start(async () => setRows(await loadInsightTransactions(filter)))
  useEffect(() => {
    if (open) {
      setRows(null)
      reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const total = rows?.reduce((s, r) => s - r.tx.amount, 0) ?? 0
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm font-bold text-green hover:text-green-deep">
        לעסקאות <ArrowLeft className="size-4" />
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={title} description={rows ? `${rows.length} עסקאות · סה״כ ${formatILS(total)}` : "טוען…"}>
        {!rows ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.length === 0 ? <div className="py-6 text-sm text-muted-foreground">לא נמצאו עסקאות.</div> : null}
            {rows.map(({ tx, account, category }) => (
              <div key={tx.id} className={cn("flex flex-col gap-2 py-3", tx.isExcluded && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold">
                      {tx.merchantName || tx.description || "—"}
                      {category ? <span className="ms-2 text-xs font-medium text-muted-foreground">{category.emoji} {category.nameHe}</span> : null}
                    </div>
                    <TxMeta tx={tx} source={account ? accountLabel(account) : tx.providerId} />
                  </div>
                  <div className={cn("shrink-0 font-black tabular-nums", tx.amount > 0 && "text-green")}>{formatILS(tx.amount)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <CategorySelect tx={tx} categories={categories} onSaved={reload} />
                  <CountToggle tx={tx} onDone={reload} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ResponsivePanel>
    </>
  )
}
