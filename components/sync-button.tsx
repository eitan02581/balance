"use client"

import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { syncNow } from "@/lib/actions"
import { Button } from "@/components/ui/button"

export function SyncButton({ label }: { label: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-green-deep">
        <span className="size-2 rounded-full bg-green" />
        {label}
      </div>
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
  )
}
