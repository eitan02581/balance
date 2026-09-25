"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import type { Account, Category, Transaction } from "@/db/schema"
import { formatILS } from "@/lib/money"
import { accountLabel, EXCLUSION_LABELS } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { Card } from "@/components/cards"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CategorySelect, CountToggle, UnlockButton } from "@/components/transaction-row"

const ORDER = ["manual", "unreviewed", "card_charge", "internal_transfer", "savings", "income", "zero"]

export function NotCountedCard({ rows, categories }: { rows: { tx: Transaction; account: Account | null }[]; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const groups = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = r.tx.exclusionReason ?? "manual"
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  const debits = rows.filter((r) => r.tx.amount < 0 && r.tx.exclusionReason !== "card_charge").reduce((s, r) => s - r.tx.amount, 0)
  const manual = groups.get("manual") ?? []
  return (
    <Card className="p-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-start">
          <div>
            <div className="font-extrabold">לא נספר בהוצאות</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              {rows.length} תנועות · {manual.length > 0 ? `${manual.length} שסימנתם ידנית (${formatILS(manual.reduce((s, r) => s - r.tx.amount, 0))})` : "חיובי כרטיס, העברות, חיסכון והכנסות"}
              {debits > 0 ? ` · סה״כ יצא ${formatILS(debits)} שלא נחשב הוצאה` : ""}
            </div>
          </div>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 flex flex-col gap-4">
            {ORDER.filter((k) => groups.has(k)).map((k) => (
              <div key={k}>
                <div className="mb-1.5 text-xs font-bold text-muted-foreground">{EXCLUSION_LABELS[k] ?? k}</div>
                <div className="flex flex-col divide-y divide-border">
                  {groups.get(k)!.map(({ tx, account }) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {tx.merchantName || tx.description || "—"}
                          {tx.note ? <span className="ms-2 rounded-full bg-soft px-2 py-0.5 text-[11px] font-bold text-green-deep">{tx.note}</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.transactionDate.slice(5).replace("-", "/")} · {account ? accountLabel(account) : tx.providerId}
                          {tx.details ? ` · ${tx.details}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={cn("font-bold tabular-nums", tx.amount > 0 ? "text-green" : "text-muted-foreground")}>{formatILS(tx.amount)}</span>
                        {k === "manual" ? <CountToggle tx={tx} /> : k === "income" || k === "savings" ? <CategorySelect tx={tx} categories={categories} /> : tx.manualLock || k === "unreviewed" ? <UnlockButton id={tx.id} /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
