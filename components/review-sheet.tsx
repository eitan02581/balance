"use client"

import { useEffect, useState, useTransition } from "react"
import { AlertCircle } from "lucide-react"

import type { Category } from "@/db/schema"
import { loadReviewQueue } from "@/lib/actions"
import { accountLabel } from "@/lib/providers"
import { ResponsivePanel } from "@/components/responsive-panel"
import { ReviewItem } from "@/components/transaction-row"
import { ListSkeleton } from "@/components/sheet-skeleton"

type Rows = Awaited<ReturnType<typeof loadReviewQueue>>

export function ReviewSheet({ count, categories }: { count: number; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Rows | null>(null)
  const [, start] = useTransition()
  useEffect(() => {
    if (open) start(async () => setRows(await loadReviewQueue()))
  }, [open])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-[14px] bg-amber-soft px-3.5 py-3 text-[13px] font-bold text-amber-ink transition-colors hover:bg-[#ffecc4]"
      >
        <AlertCircle className="size-[18px]" />
        <span className="grow text-start">{count > 0 ? `${count} עסקאות מחכות לסיווג` : "הכול מסווג"}</span>
        <span>{count > 0 ? "לבדיקה" : "🎉"}</span>
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title="עסקאות לבדיקה" description="רק מה שלא הצלחנו לסווג לבד. סמנו 'זכרו' ולא תראו את זה שוב.">
        {!rows ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.length === 0 ? <div className="py-6 text-center text-muted-foreground">הכול מסווג 🎉</div> : null}
            {rows.map(({ tx, account }) => (
              <ReviewItem key={tx.id} tx={tx} source={account ? accountLabel(account) : tx.providerId} categories={categories} compact />
            ))}
          </div>
        )}
      </ResponsivePanel>
    </>
  )
}
