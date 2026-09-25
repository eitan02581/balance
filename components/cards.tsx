import Link from "next/link"
import { Flame, Send, AlertCircle, ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react"

import { formatILS } from "@/lib/money"
import type { CategorySpend } from "@/lib/month"
import type { Win } from "@/lib/queries"
import { cn } from "@/lib/utils"

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-3xl border border-[#edf0ee] bg-card p-5 shadow-card sm:p-6", className)}>{children}</div>
}

/** One term of the hero equation: an icon tile (same arrows as the in/out cards) instead of a white word. */
function FlowTerm({ icon: Icon, tile, label, value, minus }: { icon: typeof ArrowDownLeft; tile: string; label: string; value: number; minus?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {minus ? <span className="text-white/60" aria-hidden>−</span> : null}
      <span className={cn("flex size-6 items-center justify-center rounded-full", tile)} title={label}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="sr-only">{label}</span>
      {formatILS(value)}
    </span>
  )
}

/** The month's bottom line: what came in minus what went out (spending + investments). */
export function GapHeroCard({ income, spent, invested, daysLeft }: { income: number; spent: number; invested: number; daysLeft: number }) {
  const net = Math.round((income - spent - invested) * 100) / 100
  const short = net < 0
  const used = income > 0 ? Math.min(100, ((spent + invested) / income) * 100) : 100
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-135 from-hero-from to-hero-to p-6 text-white shadow-[0_10px_30px_rgba(25,42,31,0.12)] sm:p-7">
      <div className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-lime opacity-[0.14]" />
      <div className="text-[13px] font-bold text-white/75">{short ? "חסר החודש: יצא יותר ממה שנכנס" : "נשאר החודש אחרי הוצאות והשקעות"}</div>
      <div className={cn("mt-2 text-[42px] leading-none font-black tabular-nums sm:text-[50px]", short ? "text-coral" : "text-lime")}>{formatILS(net)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[15px] font-bold tabular-nums">
        <FlowTerm icon={ArrowDownLeft} tile="bg-lime text-hero-from" label="נכנס" value={income} />
        <FlowTerm minus icon={ArrowUpRight} tile="bg-coral text-hero-from" label="יצא להוצאות" value={spent} />
        {invested > 0 ? <FlowTerm minus icon={TrendingUp} tile="bg-sky text-hero-from" label="הושקע" value={invested} /> : null}
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/18" aria-hidden>
        <div className={cn("h-full rounded-full", short ? "bg-coral" : "bg-lime")} style={{ width: `${used}%` }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[13px] text-white/85">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", short ? "bg-coral" : "bg-lime")} />
          {income === 0 ? "עדיין לא נכנס כסף החודש" : `יצאו ${Math.round(((spent + invested) / income) * 100)}% ממה שנכנס`}
        </span>
        <span>{daysLeft > 0 ? `${daysLeft} ימים לסוף החודש` : "החודש הסתיים"}</span>
      </div>
    </div>
  )
}

/** How spending stands against the monthly spending target. */
export function BudgetCard({ remaining, spent, target, pct }: { remaining: number; spent: number; target: number; pct: number }) {
  const over = remaining < 0
  return (
    <Card className="flex flex-col justify-center gap-2">
      <div className="text-sm font-bold text-muted-foreground">{over ? "מעבר ליעד ההוצאות" : "נשאר במסגרת יעד ההוצאות"}</div>
      <div className={cn("text-[32px] leading-tight font-black tabular-nums sm:text-[36px]", over ? "text-destructive" : "text-green")}>{formatILS(Math.abs(remaining))}</div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", over ? "bg-coral" : "bg-green")} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[13px] text-muted-foreground">
        {formatILS(spent)} הוצאו מתוך יעד של {formatILS(target)}
      </div>
    </Card>
  )
}

export function StatCard({ title, value, sub, tone }: { title: string; value: string; sub: string; tone?: "good" | "bad" }) {
  return (
    <Card className="flex flex-col justify-center gap-2">
      <div className="text-sm font-bold text-muted-foreground">{title}</div>
      <div className={cn("text-[32px] leading-tight font-black sm:text-[36px]", tone === "good" && "text-green", tone === "bad" && "text-destructive")}>{value}</div>
      <div className="text-[13px] text-muted-foreground">{sub}</div>
    </Card>
  )
}

const WIN_ICON = {
  streak: { Icon: Flame, cls: "bg-amber-soft text-[#b06a12]" },
  goal: { Icon: Send, cls: "bg-[#e6eefc] text-[#2c5ab0]" },
}

export function WinCard({ win }: { win: Win }) {
  const { Icon, cls } = WIN_ICON[win.icon]
  return (
    <Card className="flex items-start gap-3.5 p-5">
      <div className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-[14px]", cls)}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-extrabold">{win.title}</div>
        <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{win.sub}</div>
      </div>
    </Card>
  )
}

const DONUT_COLORS = ["#2f7d5a", "#92b8f4", "#f4c46a", "#b49bea", "#ef8f87", "#8fd2bd", "#d4d8d5"]

export function Donut({ total, categories, uncategorised }: { total: number; categories: CategorySpend[]; uncategorised: number }) {
  const slices = [
    ...categories
      .filter((c) => c.spent > 0)
      .slice(0, 7)
      .map((c) => ({ label: `${c.emoji} ${c.nameHe}`, value: c.spent })),
  ]
  const shown = slices.reduce((s, x) => s + x.value, 0)
  const rest = Math.max(0, total - shown)
  if (rest > 0.5)
    slices.push({
      label: uncategorised > 0 && rest === uncategorised ? "לא מסווג" : "אחר",
      value: rest,
    })
  let acc = 0
  const stops = slices.map((s, i) => {
    const from = total > 0 ? (acc / total) * 100 : 0
    acc += s.value
    const to = total > 0 ? (acc / total) * 100 : 0
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${from}% ${to}%`
  })
  const bg = total > 0 ? `conic-gradient(${stops.join(", ")})` : "#edf1ee"
  return (
    <Card className="flex flex-col items-center gap-5">
      <div className="self-start text-start font-extrabold">חלוקה באחוזים</div>
      <div className="relative size-[170px] shrink-0 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-card">
          <div className="text-xl font-black">{formatILS(total)}</div>
          <div className="text-xs text-muted-foreground">הוצאות החודש</div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5 text-sm">
        {slices.length === 0 ? <div className="text-muted-foreground">עדיין אין הוצאות החודש.</div> : null}
        {slices.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="min-w-0 grow truncate">{s.label}</span>
            <span className="w-10 text-end text-xs font-bold text-muted-foreground tabular-nums">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
            <b className="w-16 text-end tabular-nums">{formatILS(s.value)}</b>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReviewStrip({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Link href="/review" className="flex items-center gap-2.5 rounded-[14px] bg-amber-soft px-3.5 py-3 text-[13px] font-bold text-amber-ink transition-colors hover:bg-[#ffecc4]">
      <AlertCircle className="size-[18px]" />
      <span className="grow">{count} עסקאות מחכות לסיווג</span>
      <span>לבדיקה</span>
    </Link>
  )
}
