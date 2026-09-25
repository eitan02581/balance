import Link from "next/link"
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react"

import { AccountsSheet, type AccountHealthRow } from "@/components/accounts-sheet"
import { CategoryBars, type BarRow } from "@/components/category-bars"
import { BudgetCard, Card, GapHeroCard, WinCard } from "@/components/cards"
import { FlowCard } from "@/components/flow-card"
import { DonutCard } from "@/components/donut-card"
import { toDonut } from "@/lib/donut"
import { isIncome, isInvestment, sumInvested, summarizeIncome } from "@/lib/income"
import { NotCountedHint } from "@/components/category-sheet"
import { IncomeCard, IncomeSheet } from "@/components/income-card"
import { InfoPopover } from "@/components/info-popover"
import { MonthTransactions, TransactionList } from "@/components/month-transactions"
import { NotCountedCard } from "@/components/not-counted-card"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { ReviewSheet } from "@/components/review-sheet"
import { Sparkline } from "@/components/sparkline"
import { Button } from "@/components/ui/button"
import { syncIfStale } from "@/lib/financy/sync"
import { canCloseMonth } from "@/lib/month"
import { addMonths, daysInMonth, formatILS, monthKey, monthLabelHe, monthNameHe, relativeTimeHe } from "@/lib/money"
import { accountLabel, ACCOUNT_TYPE_HE, connectionHealth } from "@/lib/providers"
import { getAccountsWithHealth, getBaseline, getCategories, getGoals, getGrocerySplit, getInsightCount, getLastSync, getMonthClose, getMonthSummary, getNotCounted, getPlan, getSpendingTrend, getTransactions, getWins } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Jerusalem",
    }).format(new Date())
  )
  if (h < 5) return "לילה טוב"
  if (h < 12) return "בוקר טוב"
  if (h < 17) return "צהריים טובים"
  return "ערב טוב"
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams
  const current = monthKey()
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) && sp.month <= current ? sp.month : current
  const isCurrent = month === current
  if (isCurrent) await syncIfStale(3)
  const [summary, plan, goalsList, sync, closed, baseline, trend, notCounted, accountsRows, categories, insightCount, grocery, monthTx] = await Promise.all([
    getMonthSummary(month),
    getPlan(month),
    getGoals(),
    getLastSync(),
    getMonthClose(month),
    getBaseline(month),
    getSpendingTrend(6, month),
    getNotCounted(month),
    getAccountsWithHealth(month),
    getCategories(),
    getInsightCount(),
    getGrocerySplit(month),
    getTransactions({ month }),
  ])
  const defaultGoal = goalsList.find((g) => g.id === plan.defaultGoalId) ?? goalsList[0] ?? null
  const wins = await getWins(summary, defaultGoal)
  const canClose = !closed && canCloseMonth(month)

  const bars: BarRow[] = summary.categories
    .filter((c) => c.spent > 0 || c.monthlyTarget || (baseline.categories.get(c.id)?.median ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      label: c.nameHe,
      emoji: c.emoji,
      spent: c.spent,
      median: baseline.categories.get(c.id)?.median ?? 0,
      target: c.monthlyTarget,
      state: c.state,
      note: grocery && c.id === grocery.categoryId && grocery.main.n + grocery.additions.n > 0 ? `${grocery.main.n} קניות גדולות · ${grocery.additions.n} השלמות` : undefined,
    }))
    .sort((a, b) => b.spent - a.spent)
  if (summary.uncategorised > 0)
    bars.push({
      id: null,
      label: "לא מסווג",
      emoji: "❔",
      spent: summary.uncategorised,
      median: 0,
      target: null,
      state: "none",
    })

  const trendMap = new Map(trend.map((t) => [t.month, t.spent]))
  const spark = Array.from({ length: 6 }, (_, i) => {
    const m = `${month.slice(0, 4)}-${String(Number(month.slice(5)) - 5 + i).padStart(2, "0")}`
    return { month: m, spent: trendMap.get(m) ?? 0 }
  })
  const vsBaseline = summary.spent - baseline.total.median
  // share of a normal month already spent vs. share of the month already gone: ahead of pace = heading for a pricier month
  const baselinePct = baseline.total.median > 0 ? (summary.spent / baseline.total.median) * 100 : 0
  const elapsedPct = ((daysInMonth(month) - summary.daysLeft) / daysInMonth(month)) * 100
  const aheadOfPace = vsBaseline > 0 || baselinePct > elapsedPct
  // income rows, plus income rows the user set to "not counted" (kept visible, dimmed, so the choice can be reversed)
  const incomeRows = monthTx.filter((r) => isIncome(r.tx) || (r.tx.exclusionReason === "manual" && r.category?.kind === "income"))
  const income = summarizeIncome(
    incomeRows.map((r) => r.tx),
    categories
  )
  // money sent to savings/investments, plus such rows the user set to "not counted" (visible, dimmed)
  const investRows = monthTx.filter((r) => isInvestment(r.tx, r.account) || (r.tx.exclusionReason === "manual" && r.category?.kind === "savings" && r.tx.amount < 0))
  const invested = sumInvested(investRows)

  const health: AccountHealthRow[] = accountsRows
    .filter((r) => r.account.role !== "ignore")
    .map((r) => ({
      id: r.account.id,
      label: accountLabel(r.account),
      provider: r.account.providerId,
      type: ACCOUNT_TYPE_HE[r.account.accountType] ?? r.account.accountType,
      balance: r.account.balance,
      monthSpend: r.monthSpend,
      status: connectionHealth(r.connection?.status, r.connection?.expiryDate),
      lastFetchedAt: r.connection?.lastFetchedAt ?? null,
    }))

  return (
    <>
      <PageHeader title={isCurrent ? `${greeting()} 👋` : monthLabelHe(month)} sub={isCurrent ? `תמונה אחת פשוטה של ${monthNameHe(month)}.` : "חודש שהסתיים. אותה תמונה, אותם כללים."}>
        <div className={cn("flex items-center gap-1 rounded-full border p-1", isCurrent ? "border-border bg-card" : "border-sky bg-sky/20")}>
          <Link href={`/?month=${addMonths(month, -1)}`} className="rounded-full p-2 hover:bg-muted" aria-label="חודש קודם">
            <ChevronRight className="size-4" />
          </Link>
          <span className="min-w-[110px] text-center text-sm font-bold">{isCurrent ? `${monthNameHe(month)} · עכשיו` : monthLabelHe(month)}</span>
          {isCurrent ? (
            <span className="p-2 text-muted-foreground/40">
              <ChevronLeft className="size-4" />
            </span>
          ) : (
            <Link href={addMonths(month, 1) === current ? "/" : `/?month=${addMonths(month, 1)}`} className="rounded-full p-2 hover:bg-muted" aria-label="חודש הבא">
              <ChevronLeft className="size-4" />
            </Link>
          )}
        </div>
        {isCurrent ? <AccountsSheet label={sync.lastOkAt ? `עודכן ${relativeTimeHe(sync.lastOkAt)}` : "עדיין לא סונכרן"} rows={health} lastSync={sync.lastOkAt} /> : null}
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr_0.9fr]">
        <GapHeroCard income={income.total} spent={summary.spent} invested={invested} daysLeft={summary.daysLeft} />
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:contents">
          <FlowCard icon={<ArrowDownLeft className="size-4" />} label="נכנס" value={income.total} tile="bg-soft text-green-deep" tone="text-green-deep" sub={income.buckets[0] ? `הכי הרבה מ${income.buckets[0].nameHe} (${formatILS(income.buckets[0].amount)})` : "עדיין אין הכנסות החודש"} panelTitle={`הכנסות והשקעות ${monthNameHe(month)}`} panelDescription="שינוי סיווג כאן חל על כל ההעברות מאותו גורם. אפשר להעביר שורה בין הכנסה, השקעה, הוצאה ולא־נספר, ולהוסיף הערה.">
            <IncomeSheet rows={incomeRows} investRows={investRows} categories={categories} />
          </FlowCard>
          <FlowCard icon={<ArrowUpRight className="size-4" />} label="יצא להוצאות" value={summary.spent} tile="bg-[#fde8e6] text-[#a13a31]" tone="text-[#a13a31]" sub={invested > 0 ? `ועוד ${formatILS(invested)} שהלכו להשקעות` : "לא כולל השקעות וחיסכון"} panelTitle={`הוצאות ${monthNameHe(month)}`} panelDescription="שינוי קטגוריה כאן חל על כל העסקאות של אותו ספק.">
            <TransactionList rows={monthTx} categories={categories} />
          </FlowCard>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <BudgetCard remaining={summary.remaining} spent={summary.spent} target={summary.spendingTarget} pct={summary.progressPct} />
        <Card className="flex flex-col justify-center gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
              לעומת חודש רגיל
              <InfoPopover title="חודש רגיל">
                החציון של {baseline.total.months} החודשים המלאים האחרונים: {formatILS(baseline.total.median)}. חצי מהחודשים היו מתחת, חצי מעל.
                <br />
                <br />
                {isCurrent ? 'באמצע החודש המספר אומר כמה מ"חודש רגיל" כבר ניצלתם. אם הפס מגיע ל־100% לפני שהחודש נגמר, זה חודש יקר מהרגיל.' : "בחודש שהסתיים המספר הוא ההפרש מחודש רגיל."}
              </InfoPopover>
            </div>
            <Sparkline data={spark} className="hidden h-9 w-24 sm:block" />
          </div>
          {isCurrent ? (
            <>
              <div className={cn("text-[32px] leading-tight font-black tabular-nums sm:text-[36px]", vsBaseline > 0 ? "text-destructive" : aheadOfPace ? "text-amber-ink" : "text-foreground")}>
                {Math.round(baselinePct)}%<span className="text-base font-semibold text-muted-foreground"> מחודש רגיל</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", aheadOfPace ? "bg-coral" : "bg-green")} style={{ width: `${Math.min(100, baselinePct)}%` }} />
              </div>
              <div className="text-[13px] text-muted-foreground">
                {formatILS(summary.spent)} מתוך {formatILS(baseline.total.median)} · עברו {Math.round(elapsedPct)}% מהחודש ·{" "}
                <Link href="/baseline" className="underline">
                  הבסיס
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className={cn("text-[32px] leading-tight font-black sm:text-[36px]", vsBaseline > 0 ? "text-destructive" : "text-green")}>{formatILS(Math.abs(vsBaseline))}</div>
              <div className="text-[13px] text-muted-foreground">
                {vsBaseline > 0 ? "יותר" : "פחות"} מחודש רגיל ({formatILS(baseline.total.median)}) ·{" "}
                <Link href="/baseline" className="underline">
                  הבסיס
                </Link>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="mt-4">
        <IncomeCard monthLabel={monthNameHe(month)} total={income.total} buckets={income.buckets} rows={incomeRows} investRows={investRows} categories={categories} />
      </section>

      <SectionTitle
        title="לאן הכסף הולך?"
        action={
          <Link href="/expenses" className="flex items-center gap-1.5 text-sm font-bold text-green hover:text-green-deep">
            הטבלה המלאה <ArrowLeft className="size-4" />
          </Link>
        }
      />
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="order-2 flex flex-col gap-4 lg:order-none">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="font-extrabold">
              {formatILS(summary.spent)} <span className="text-sm font-medium text-muted-foreground">הוצאות {monthNameHe(month)}</span>
            </div>
            <div className="text-xs text-muted-foreground">תקרה היא גבול עליון, לא סכום שצריך להוציא</div>
          </div>
          <CategoryBars month={month} rows={bars} total={summary.spent} categories={categories} />
          <NotCountedHint />
        </Card>
        <div className="order-1 flex flex-col gap-4 self-start lg:sticky lg:top-6 lg:order-none">
          <Card className="flex flex-col gap-3">
            <div className="text-[12px] font-bold text-muted-foreground">ההסכם שלנו לחודש</div>
            <div className="text-[15px] leading-snug font-extrabold">
              שומרים לפחות {formatILS(summary.savingsTarget)}
              {defaultGoal ? ` וכל שקל נוסף הולך ל${defaultGoal.name} ${defaultGoal.emoji}` : ""}
            </div>
            <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-green-deep">
              <span className="rounded-full bg-soft px-2.5 py-1">יעד הוצאות {formatILS(summary.spendingTarget)}</span>
              <span className="rounded-full bg-soft px-2.5 py-1">יעד חיסכון {formatILS(summary.savingsTarget)}</span>
            </div>
            <Link href="/settings" className="text-[13px] font-bold text-green underline">
              עריכת התוכנית
            </Link>
          </Card>
          <ReviewSheet count={summary.needsReviewCount} categories={categories} />
          {insightCount > 0 ? (
            <Link href="/insights" className="flex items-center gap-2.5 rounded-[14px] bg-[#e6eefc] px-3.5 py-3 text-[13px] font-bold text-[#2c5ab0] transition-colors hover:bg-[#d8e5fb]">
              <Lightbulb className="size-[18px]" />
              <span className="grow">{insightCount} דברים שאפשר לשפר</span>
              <span>תובנות</span>
            </Link>
          ) : null}
          {wins.map((w) => (
            <WinCard key={w.title} win={w} />
          ))}
          <DonutCard
            monthLabel={monthNameHe(month)}
            month={toDonut(
              summary.categories.map((c) => ({
                emoji: c.emoji,
                nameHe: c.nameHe,
                value: c.spent,
              })),
              summary.spent,
              `הוצאות ${monthNameHe(month)}`
            )}
            average={toDonut(
              summary.categories.map((c) => ({
                emoji: c.emoji,
                nameHe: c.nameHe,
                value: baseline.categories.get(c.id)?.avg ?? 0,
              })),
              baseline.total.avg,
              `ממוצע ${baseline.total.months} חודשים`
            )}
          />
        </div>
      </section>

      {summary.bonus > 0 ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#d9ebe0] bg-soft px-6 py-5">
          <div>
            <div className="text-xl font-extrabold text-green-deep">{formatILS(summary.bonus, { sign: true })} מעל יעד החיסכון 🎉</div>
            <div className="mt-1 text-[13px] text-[#3f5a49]">{defaultGoal ? `בסוף החודש תוכלו לצבוע אותו ל${defaultGoal.name}, גם כשהכסף נשאר מושקע.` : "בסוף החודש תוכלו לצבוע אותו ליעד משותף."}</div>
          </div>
          {canClose ? (
            <Button asChild size="lg" className="rounded-xl font-bold">
              <Link href={`/month-close?month=${month}`}>סגירת {monthNameHe(month)}</Link>
            </Button>
          ) : (
            <span className="text-[13px] text-[#3f5a49]">סגירת החודש תיפתח ב־28 בחודש</span>
          )}
        </section>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <MonthTransactions rows={monthTx} categories={categories} monthLabel={monthNameHe(month)} />
        <NotCountedCard rows={notCounted} categories={categories} />
      </div>
    </>
  )
}
