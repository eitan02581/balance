"use client"

import { useState } from "react"

import { formatILS } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Card } from "@/components/cards"
import type { DonutData } from "@/lib/donut"

export type { DonutData } from "@/lib/donut"

const COLORS = ["#2f7d5a", "#92b8f4", "#f4c46a", "#b49bea", "#ef8f87", "#8fd2bd", "#e0b48a", "#7fa7c9"]
const REST = "#d4d8d5"

function Ring({ data }: { data: DonutData }) {
  let acc = 0
  const stops = data.slices.map((s, i) => {
    const from = data.total > 0 ? (acc / data.total) * 100 : 0
    acc += s.value
    const to = data.total > 0 ? (acc / data.total) * 100 : 0
    const color = s.label === "אחר" ? REST : COLORS[i % COLORS.length]
    return `${color} ${from}% ${to}%`
  })
  const bg = data.total > 0 ? `conic-gradient(${stops.join(", ")})` : "#edf1ee"
  return (
    <>
      <div className="relative size-[170px] shrink-0 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-card">
          <div className="text-xl font-black">{formatILS(data.total)}</div>
          <div className="text-xs text-muted-foreground">{data.caption}</div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5 text-sm">
        {data.slices.length === 0 ? <div className="text-muted-foreground">אין נתונים.</div> : null}
        {data.slices.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: s.label === "אחר" ? REST : COLORS[i % COLORS.length] }} />
            <span className="min-w-0 grow truncate">{s.label}</span>
            <span className="w-10 text-end text-xs font-bold tabular-nums text-muted-foreground">{data.total > 0 ? Math.round((s.value / data.total) * 100) : 0}%</span>
            <b className="w-16 text-end tabular-nums">{formatILS(s.value)}</b>
          </div>
        ))}
      </div>
    </>
  )
}

export function DonutCard({ month, average, monthLabel }: { month: DonutData; average: DonutData; monthLabel: string }) {
  const [view, setView] = useState<"month" | "average">("month")
  const data = view === "month" ? month : average
  return (
    <Card className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="font-extrabold">חלוקה באחוזים</div>
        <div className="flex rounded-full bg-muted p-0.5 text-[12px] font-bold">
          {(["month", "average"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-full px-3 py-1 transition-colors", view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {v === "month" ? monthLabel : "ממוצע"}
            </button>
          ))}
        </div>
      </div>
      <Ring data={data} />
    </Card>
  )
}
