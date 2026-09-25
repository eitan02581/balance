import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { dismissInsight } from "@/lib/actions"
import { getInsights } from "@/lib/insights"
import { getCategories } from "@/lib/queries"
import { InsightSheet } from "@/components/insight-sheet"
import { formatILS } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function InsightsPage() {
  const [insights, categories] = await Promise.all([getInsights(), getCategories()])
  const yearly = insights.reduce((s, i) => s + (i.amount ?? 0) * 12, 0)
  return (
    <>
      <PageHeader title="תובנות" sub="דברים שהמספרים מראים ואפשר לעשות משהו לגביהם. מחושב מחדש בכל כניסה." />
      {insights.length === 0 ? (
        <Card className="text-sm text-muted-foreground">אין כרגע משהו לשפר. אם משהו יחזור (למשל דמי כרטיס), הוא יופיע כאן שוב לבד.</Card>
      ) : (
        <>
          {yearly > 0 ? (
            <div className="mb-4 rounded-3xl border border-[#d9ebe0] bg-soft px-6 py-4 text-sm text-green-deep">
              הפריטים שלמטה שווים יחד בערך <b>{formatILS(yearly)} בשנה</b>. רובם שיחת טלפון אחת.
            </div>
          ) : null}
          <section className="flex flex-col gap-4">
            {insights.map((i) => (
              <Card key={i.key} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{i.emoji}</span>
                    <div>
                      <div className="text-[16px] font-extrabold">{i.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{i.body}</div>
                    </div>
                  </div>
                  {i.amount ? (
                    <div className="shrink-0 text-end">
                      <div className="text-xl font-black">{formatILS(i.amount)}</div>
                      <div className="text-[11px] text-muted-foreground">בחודש</div>
                    </div>
                  ) : null}
                </div>
                {i.action ? <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">💡 {i.action}</div> : null}
                <div className="flex flex-wrap items-center gap-3">
                  {i.filter ? (
                    <InsightSheet title={i.title} filter={i.filter} categories={categories} />
                  ) : i.href ? (
                    <Link href={i.href} className="flex items-center gap-1 text-sm font-bold text-green hover:text-green-deep">
                      לחשבונות <ArrowLeft className="size-4" />
                    </Link>
                  ) : null}
                  <ActionForm action={dismissInsight.bind(null, i.key)} success="סומן כטופל. נזכיר אם זה יחזור" className="ms-auto">
                    <button type="submit" className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Check className="size-4" /> טופל, הזכירו לי אם זה חוזר
                    </button>
                  </ActionForm>
                </div>
              </Card>
            ))}
          </section>
        </>
      )}
    </>
  )
}
