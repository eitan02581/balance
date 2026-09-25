"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatILS, monthNameHe } from "@/lib/money"

const config = { spent: { label: "הוצאות", color: "var(--green)" }, current: { label: "החודש הנוכחי", color: "var(--sky)" } } satisfies ChartConfig

/** 6-month bars with a dashed median line. Months run right-to-left in RTL. */
export function TrendChart({ data, median, current, onSelect }: { data: { month: string; spent: number }[]; median?: number; current: string; onSelect?: (month: string) => void }) {
  const rows = data.map((d) => ({ ...d, label: monthNameHe(d.month).slice(0, 4), isCurrent: d.month === current }))
  return (
    <ChartContainer config={config} className={onSelect ? "h-40 w-full [&_.recharts-bar-rectangle]:cursor-pointer" : "h-40 w-full"}>
      <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" reversed tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatILS(Number(v))} labelKey="label" />} />
        {median && median > 0 ? <ReferenceLine y={median} stroke="var(--muted-ink)" strokeDasharray="4 4" /> : null}
        <Bar
          dataKey="spent"
          fill="var(--color-spent)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
          onClick={onSelect ? (data: unknown) => { const m = (data as { payload?: { month?: string }; month?: string })?.payload?.month ?? (data as { month?: string })?.month; if (m) onSelect(m) } : undefined}
        >
          {rows.map((r) => (
            <Cell key={r.month} fill={r.isCurrent ? "var(--color-current)" : "var(--color-spent)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export function TrendLegend({ median, partial = true }: { median: number; partial?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {median > 0 ? <span>קו מקווקו = החציון שלכם ({formatILS(median)})</span> : null}
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm bg-sky" /> {partial ? "החודש הנוכחי (עדיין לא הסתיים)" : "החודש שמוצג"}
      </span>
    </div>
  )
}
