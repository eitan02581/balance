"use client"

import { useState } from "react"
import { ChevronLeft, Inbox } from "lucide-react"

import type { Account, Category, Transaction } from "@/db/schema"
import type { IncomeBucket } from "@/lib/income"
import { formatILS } from "@/lib/money"
import { accountLabel } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { Card } from "@/components/cards"
import { ResponsivePanel } from "@/components/responsive-panel"
import { CategorySelect, CountToggle, NoteInput, TxMeta } from "@/components/transaction-row"

type Row = { tx: Transaction; account: Account | null }

function SheetSection({ title, rows, categories, empty }: { title: string; rows: Row[]; categories: Category[]; empty: string }) {
  const sum = rows.filter((r) => r.tx.exclusionReason !== "manual").reduce((s, r) => s + Math.abs(r.tx.amount), 0)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm font-extrabold">
          {title} <span className="text-xs font-medium text-muted-foreground">· {rows.length}</span>
        </div>
        <div className="text-sm font-bold tabular-nums">{formatILS(sum)}</div>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {rows.map(({ tx, account }) => {
          const notCounted = tx.exclusionReason === "manual"
          return (
            <div key={tx.id} className={cn("flex flex-col gap-3 py-4", notCounted && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-bold">
                    {tx.merchantName || tx.description || "—"}
                    {notCounted ? <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">לא נספר</span> : null}
                  </div>
                  <TxMeta tx={tx} source={account ? accountLabel(account) : tx.providerId} />
                </div>
                <div className={cn("shrink-0 font-black tabular-nums", tx.amount > 0 && "text-green", notCounted && "line-through")}>{formatILS(tx.amount)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CategorySelect tx={tx} categories={categories} />
                <CountToggle tx={tx} />
              </div>
              <NoteInput tx={tx} className="w-full" />
            </div>
          )
        })}
        {rows.length === 0 ? <div className="py-3 text-sm text-muted-foreground">{empty}</div> : null}
      </div>
    </div>
  )
}

/** The month's income rows and investment rows, each editable. */
export function IncomeSheet({ rows, investRows, categories }: { rows: Row[]; investRows: Row[]; categories: Category[] }) {
  return (
    <div className="flex flex-col gap-6">
      <SheetSection title="הכנסות" rows={rows} categories={categories} empty="אין הכנסות החודש." />
      <SheetSection title="השקעות וחיסכון" rows={investRows} categories={categories} empty="לא נשלח כסף להשקעות החודש. אפשר לסווג העברה כ״חיסכון / השקעה״ מכל רשימת עסקאות." />
    </div>
  )
}

/** Where this month's money came from, and the month's income + investment rows editable in a sheet. */
export function IncomeCard({ monthLabel, total, buckets, rows, investRows, categories }: { monthLabel: string; total: number; buckets: IncomeBucket[]; rows: Row[]; investRows: Row[]; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const counted = rows.filter((r) => r.tx.exclusionReason === "income").length + investRows.filter((r) => r.tx.exclusionReason === "savings").length
  return (
    <>
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold">מאיפה הכסף הגיע</div>
            <div className="text-[13px] text-muted-foreground">
              {monthLabel} · {formatILS(total)} נכנסו לבנק
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-bold text-green transition-colors duration-200 hover:bg-soft hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            הכנסות והשקעות
            <span className="rounded-full bg-soft px-1.5 text-[12px] text-green-deep tabular-nums">{counted}</span>
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          {buckets.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Inbox className="size-4" aria-hidden /> עדיין אין הכנסות החודש.
            </div>
          ) : null}
          {buckets.map((b) => {
            const share = total > 0 ? b.amount / total : 0
            return (
              <button
                key={b.id ?? "none"}
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`${b.nameHe}, ${formatILS(b.amount)}, פתיחת ההכנסות`}
                className="group -mx-2 cursor-pointer rounded-xl px-2 py-2 text-start transition-colors duration-200 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="shrink-0" aria-hidden>
                      {b.emoji}
                    </span>
                    <span className="truncate">{b.nameHe}</span>
                    <span className="text-xs font-medium text-muted-foreground">· {b.n}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums">
                    <b>{formatILS(b.amount)}</b>
                    <span className="text-muted-foreground"> · {Math.round(share * 100)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-green transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${share * 100}%` }} />
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <ResponsivePanel open={open} onOpenChange={setOpen} title={`הכנסות והשקעות ${monthLabel}`} description="שינוי סיווג כאן חל על כל ההעברות מאותו גורם. אפשר להעביר שורה בין הכנסה, השקעה, הוצאה ולא־נספר, ולהוסיף הערה.">
        <IncomeSheet rows={rows} investRows={investRows} categories={categories} />
      </ResponsivePanel>
    </>
  )
}
