"use client"

import { Line, LineChart } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const config = { spent: { label: "הוצאות", color: "var(--green)" } } satisfies ChartConfig

export function Sparkline({ data, className }: { data: { month: string; spent: number }[]; className?: string }) {
  return (
    <ChartContainer config={config} className={className ?? "h-10 w-28"}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line type="monotone" dataKey="spent" stroke="var(--color-spent)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}
