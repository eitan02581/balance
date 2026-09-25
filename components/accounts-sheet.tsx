"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { syncNow } from "@/lib/actions"
import { formatILS, relativeTimeHe } from "@/lib/money"
import { cn } from "@/lib/utils"
import { ResponsivePanel } from "@/components/responsive-panel"
import { Button } from "@/components/ui/button"
import { ProviderLogo } from "@/components/provider-logo"

export type AccountHealthRow = { id: string; label: string; provider: string; type: string; balance: number | null; monthSpend: number; status: { label: string; tone: "ok" | "warn" | "bad" }; lastFetchedAt: Date | null }

const TONE = { ok: "bg-soft text-green-deep", warn: "bg-amber-soft text-amber-ink", bad: "bg-[#fde8e6] text-[#a13a31]" }

export function AccountsSheet({ label, rows, lastSync }: { label: string; rows: AccountHealthRow[]; lastSync: Date | null }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const worst = rows.some((r) => r.status.tone === "bad") ? "bad" : rows.some((r) => r.status.tone === "warn") ? "warn" : "ok"
  return (
    <>
      <div className="flex items-center gap-2.5">
        {/* Phone: a 44px dot button (the text lives in the sheet). Tablet+: dot + "עודכן לפני…". */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`חשבונות · ${label}`}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-0 text-[13px] font-semibold text-green-deep transition-colors duration-200 hover:bg-muted sm:w-auto sm:px-3.5"
        >
          <span className={cn("size-2.5 rounded-full sm:size-2", worst === "ok" ? "bg-green" : worst === "warn" ? "bg-amber" : "bg-coral")} />
          <span className="hidden sm:inline">{label}</span>
        </button>
        <Button
          variant="outline"
          size="icon"
          aria-label="סנכרן עכשיו"
          disabled={pending}
          className="size-11 rounded-full bg-card"
          onClick={() =>
            start(async () => {
              const r = await syncNow()
              if (r.ok) toast.success(`סונכרן: ${r.txUpserted} עסקאות עודכנו`)
              else toast.error(`הסנכרון נכשל: ${r.error}`)
            })
          }
        >
          <RefreshCw className={pending ? "animate-spin" : ""} />
        </Button>
      </div>
      <ResponsivePanel open={open} onOpenChange={setOpen} title="חשבונות וכרטיסים" description={`Balance עודכן ${relativeTimeHe(lastSync)}`}>
        <div className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <ProviderLogo providerId={r.provider} size={36} />
              <div className="min-w-0 grow">
                <div className="truncate font-bold">{r.label}</div>
                <div className="text-xs text-muted-foreground">
                  {r.type} · הבנק עודכן {relativeTimeHe(r.lastFetchedAt)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-bold tabular-nums">{r.type === "כרטיס אשראי" ? formatILS(r.monthSpend) : r.balance != null ? formatILS(r.balance) : "—"}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", TONE[r.status.tone])}>{r.status.label}</span>
              </div>
            </div>
          ))}
        </div>
        <Link href="/accounts" className="mt-4 inline-block text-sm font-bold text-green underline">
          ניהול חשבונות (כינויים, חיסכון/התעלמות)
        </Link>
      </ResponsivePanel>
    </>
  )
}
