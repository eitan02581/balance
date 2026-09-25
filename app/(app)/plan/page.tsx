import { Card } from "@/components/cards"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { PlanItemCard } from "@/components/plan-item"
import { PLAN_GROUPS, PLAN_ITEMS } from "@/lib/plan"
import { getActionProgress } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function PlanPage() {
  const progress = await getActionProgress()
  const total = PLAN_ITEMS.length
  const done = PLAN_ITEMS.filter((i) => progress.get(i.key)?.done).length
  return (
    <>
      <PageHeader title="צעדים" sub="כל מה שצריך לעשות, במקום אחד, עם הקישור לאיפה שעושים את זה. מסמנים ✓ כשסיימתם." />
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 py-5">
        <div>
          <div className="text-sm font-bold text-muted-foreground">התקדמות</div>
          <div className="text-[28px] font-black">
            {done} <span className="text-base font-semibold text-muted-foreground">/ {total} צעדים</span>
          </div>
        </div>
        <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-green transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </Card>
      {PLAN_GROUPS.map((g) => {
        const items = PLAN_ITEMS.filter((i) => i.group === g.key)
        const groupDone = items.filter((i) => progress.get(i.key)?.done).length
        return (
          <section key={g.key} className="mb-8">
            <SectionTitle title={`${g.title} · ${groupDone}/${items.length}`} />
            <p className="-mt-2 mb-3 text-sm text-muted-foreground">{g.sub}</p>
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const p = progress.get(item.key)
                return <PlanItemCard key={item.key} item={item} done={p?.done ?? false} note={p?.note ?? null} doneAt={p?.doneAt ?? null} />
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
