"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import type { Account } from "@/db/schema"
import { updateAccount } from "@/lib/actions"
import { SELECT_CLS } from "@/components/transaction-row"
import { cn } from "@/lib/utils"

export function AccountForm({ account }: { account: Account }) {
  const [pending, start] = useTransition()
  return (
    <form
      className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          await updateAccount(fd)
          toast.success("נשמר")
        })
      }}
    >
      <input type="hidden" name="id" value={account.id} />
      <input name="displayName" defaultValue={account.displayName ?? ""} placeholder="כינוי (למשל: החשבון של רעות)" className={cn(SELECT_CLS, "min-w-0 grow")} />
      <select name="role" defaultValue={account.role} className={SELECT_CLS} aria-label="תפקיד החשבון">
        <option value="spending">חשבון שוטף</option>
        <option value="savings">חיסכון / השקעות (לא הוצאות)</option>
        <option value="ignore">להתעלם</option>
      </select>
      <button type="submit" disabled={pending} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-bold hover:bg-muted disabled:opacity-50">
        שמירה
      </button>
    </form>
  )
}
