import { ActionForm } from "@/components/action-form"
import { BaselineTable } from "@/components/baseline-table"
import { Card } from "@/components/cards"
import { InfoPopover } from "@/components/info-popover"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { TrendChart, TrendLegend } from "@/components/trend-chart"
import { Button } from "@/components/ui/button"
import { applyBaselineAsTargets } from "@/lib/actions"
import { formatILS, monthKey, monthLabelHe, monthNameHe } from "@/lib/money"
import { getBaseline, getCategories, getMonthSummary, getSpendingTrend } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function BaselinePage() {
  const month = monthKey()
  const [baseline, categories, summary] = await Promise.all([getBaseline(month), getCategories(), getMonthSummary(month)])
  const trend = await getSpendingTrend(baseline.months.length + 1, month)
  const trendMap = new Map(trend.map((t) => [t.month, t.spent]))
  const chart = [...baseline.months, month].map((m) => ({ month: m, spent: trendMap.get(m) ?? 0 }))
  const spentNow = new Map(summary.categories.map((c) => [c.id, c.spent]))
  const rows = categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({ c, b: baseline.categories.get(c.id) ?? { avg: 0, median: 0, min: 0, max: 0, months: 0 }, now: spentNow.get(c.id) ?? 0 }))
    .filter((r) => r.b.max > 0 || r.now > 0)
    .sort((a, b) => b.b.median - a.b.median)
  const first = baseline.months[0]
  const last = baseline.months[baseline.months.length - 1]

  return (
    <>
      <PageHeader title="הבסיס שלנו" sub={`מה חודש רגיל נראה אצלכם, לפי ${baseline.months.length} חודשים מלאים (${monthNameHe(first)}–${monthLabelHe(last)}).`}>
        <ActionForm action={applyBaselineAsTargets} success="היעדים עודכנו לפי החציון ✓">
          <Button type="submit" variant="outline" className="rounded-xl font-bold">
            קבעו את החציון כיעד לקטגוריות
          </Button>
        </ActionForm>
      </PageHeader>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-muted-foreground">חציון חודשי</div>
            <InfoPopover title="חציון חודשי">
              מסדרים את כל החודשים מהזול ליקר ולוקחים את האמצעי. חצי מהחודשים היו מתחת לסכום הזה וחצי מעליו.
              <br />
              <br />
              <b>למה זה הבסיס:</b> חודש חריג אחד (שיפוץ, טיסה) לא מזיז אותו, אז הוא מייצג "חודש רגיל" אצלכם. אם החודש הנוכחי גבוה ממנו בהרבה, כדאי לפתוח את הקטגוריות ולבדוק אם זו הוצאה חד־פעמית או הרגל חדש.
            </InfoPopover>
          </div>
          <div className="mt-1 text-[28px] font-black">{formatILS(baseline.total.median)}</div>
          <div className="text-[13px] text-muted-foreground">חצי מהחודשים מתחת, חצי מעל</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-muted-foreground">ממוצע חודשי</div>
            <InfoPopover title="ממוצע חודשי">
              סך כל ההוצאות חלקי מספר החודשים. כולל את החודשים החריגים, ולכן בדרך כלל גבוה מהחציון.
              <br />
              <br />
              <b>מה לומדים ממנו:</b> הפער בין הממוצע לחציון הוא "מס החודשים החריגים" שלכם. ממוצע × 12 הוא ההערכה הטובה ביותר להוצאה השנתית, כי החריגים באמת קורים.
            </InfoPopover>
          </div>
          <div className="mt-1 text-[28px] font-black">{formatILS(baseline.total.avg)}</div>
          <div className="text-[13px] text-muted-foreground">מושפע מחודשים חריגים</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">טווח</div>
          <div className="mt-1 text-[22px] font-black">
            {formatILS(baseline.total.min)} – {formatILS(baseline.total.max)}
          </div>
          <div className="text-[13px] text-muted-foreground">החודש הכי רגוע והכי יקר</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">{monthNameHe(month)} עד עכשיו</div>
          <div className={cn("mt-1 text-[28px] font-black", summary.spent > baseline.total.median ? "text-destructive" : "text-green")}>{formatILS(summary.spent)}</div>
          <div className="text-[13px] text-muted-foreground">{formatILS(summary.spent - baseline.total.median, { sign: true })} לעומת החציון</div>
        </Card>
      </section>

      <SectionTitle title="חודש אחרי חודש" />
      <Card className="flex flex-col gap-2">
        <TrendChart data={chart} median={baseline.total.median} current={month} />
        <TrendLegend median={baseline.total.median} />
      </Card>

      <SectionTitle title="לפי קטגוריה" />
      <Card className="overflow-x-auto p-0">
        <BaselineTable
          rows={rows}
          months={baseline.months}
          currentMonth={month}
          total={{ median: baseline.total.median, avg: baseline.total.avg, min: baseline.total.min, max: baseline.total.max, now: summary.spent }}
          categories={categories}
        />
      </Card>
      <p className="mt-2 text-[13px] text-muted-foreground">לחיצה על שורה פותחת את כל העסקאות של הקטגוריה, חודש אחרי חודש.</p>
      <p className="mt-3 text-[13px] text-muted-foreground">
        חודש שאין בו הוצאה בקטגוריה נספר כ־0, כדי שהחציון ישקף מה קורה בדרך כלל. {monthNameHe(month)} עדיין לא הסתיים, אז ההפרש הוא רק "עד עכשיו".
      </p>
    </>
  )
}
