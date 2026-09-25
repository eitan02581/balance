"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"

import { formatILS } from "@/lib/money"
import { cn } from "@/lib/utils"
import { ResponsivePanel } from "@/components/responsive-panel"

/** One big cash-flow number (in / out). Tapping it opens the rows behind the number in a drawer. */
export function FlowCard({ icon, label, value, tile, tone, sub, panelTitle, panelDescription, children }: { icon: React.ReactNode; label: string; value: number; tile: string; tone: string; sub: React.ReactNode; panelTitle: string; panelDescription?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer flex-col justify-center gap-2 rounded-3xl border border-[#edf0ee] bg-card p-5 text-start shadow-card transition-colors duration-200 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:p-6"
      >
        <div className="flex w-full items-center gap-2 text-sm font-bold text-muted-foreground">
          <span className={cn("flex size-8 items-center justify-center rounded-full", tile)} aria-hidden>
            {icon}
          </span>
          <span className="grow">{label}</span>
          <ChevronLeft className="size-4" aria-hidden />
        </div>
        <div className={cn("text-[32px] leading-tight font-black tabular-nums sm:text-[36px]", tone)}>{formatILS(value)}</div>
        <div className="text-[13px] text-muted-foreground">{sub}</div>
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={panelTitle} description={panelDescription}>
        {children}
      </ResponsivePanel>
    </>
  )
}
