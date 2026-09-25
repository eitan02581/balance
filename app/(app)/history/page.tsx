import Link from "next/link"

import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { SELECT_CLS } from "@/components/transaction-row"
import { formatILS, monthKey, monthNameHe } from "@/lib/money"
import { getHistory, getMonthSummary } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const year = Number(sp.year) || Number(monthKey().slice(0, 4))
  const [h, current] = await Promise.all([getHistory(year), getMonthSummary(monthKey())])
  const years = [...new Set([...h.years, Number(monthKey().slice(0, 4))])].sort((a, b) => b - a)
  const showForecast = monthKey().startsWith(`${year}-`) && !h.rows.some((r) => r.close.month === monthKey())

  return (
    <>
      <PageHeader title="היסטוריה" sub="האם אנחנו נהיים טובים יותר בלחסוך?">
        <form method="get">
          <select name="year" defaultValue={year} className={SELECT_CLS} aria-label="שנה" onChange={undefined}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="ms-2 h-10 rounded-xl border border-border bg-card px-3 text-sm font-bold">
            הצג
          </button>
        </form>
      </PageHeader>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">חיסכון נוסף השנה</div>
          <div className="mt-1 text-[28px] font-black text-green">{formatILS(h.extraThisYear, { sign: true })}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">חודשים מעל היעד</div>
          <div className="mt-1 text-[28px] font-black">
            {h.monthsOver}
            <span className="text-base font-semibold text-muted-foreground"> / {h.rows.length}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">רצף נוכחי</div>
          <div className="mt-1 text-[28px] font-black">🔥 {h.streak}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">הוקצה ליעדים</div>
          <div className="mt-1 text-[28px] font-black">{formatILS(h.totalAllocated)}</div>
        </Card>
      </section>

      <Card className="mt-4">
        <div className="flex flex-col divide-y divide-border">
          {showForecast ? (
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 py-3 text-sm">
              <span className="font-bold">{monthNameHe(monthKey())}</span>
              <span className="text-muted-foreground">בתהליך · תחזית לפי המצב הנוכחי</span>
              <b className={cn(current.bonus >= 0 ? "text-green" : "text-destructive")}>{formatILS(current.bonus, { sign: true })}</b>
            </div>
          ) : null}
          {h.rows.length === 0 && !showForecast ? <div className="py-8 text-center text-sm text-muted-foreground">אין חודשים סגורים בשנה הזאת.</div> : null}
          {h.rows.map(({ close, goal }) => (
            <div key={close.month} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 py-3 text-sm">
              <span className="font-bold">{monthNameHe(close.month)}</span>
              <span className="text-muted-foreground">
                {formatILS(close.actualSpend)} מתוך {formatILS(close.spendingTarget)}
                {goal && close.allocatedAmount > 0 ? ` · ${goal.emoji} ${goal.name}` : ""}
              </span>
              <b className={cn(close.surplus > 0 ? "text-green" : "text-destructive")}>{formatILS(close.surplus, { sign: true })}</b>
            </div>
          ))}
        </div>
        {h.rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            חודשים נסגרים ידנית ב־
            <Link href="/month-close" className="underline">
              סגירת חודש
            </Link>
            .
          </p>
        ) : null}
      </Card>
    </>
  )
}
