import Link from "next/link"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { Card } from "@/components/cards"
import { CategoryCards } from "@/components/category-cards"
import { GroceryTag } from "@/components/grocery-tag"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { CategorySelect, SELECT_CLS, UnlockButton } from "@/components/transaction-row"
import { addMonths, formatILS, monthKey, monthLabelHe } from "@/lib/money"
import { accountLabel, EXCLUSION_LABELS } from "@/lib/providers"
import { getAccountsWithHealth, getCategories, getMonthSummary, getTransactions } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type Search = { month?: string; cat?: string; account?: string; q?: string; show?: string }

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthKey()
  const categories = await getCategories()
  // ?cat= accepts a numeric id or a slug (insights link by slug); anything unknown is ignored rather than crashing
  const categoryId = sp.cat ? (categories.find((c) => String(c.id) === sp.cat || c.slug === sp.cat)?.id ?? undefined) : undefined
  const [summary, accountsRows, rows] = await Promise.all([
    getMonthSummary(month),
    getAccountsWithHealth(month),
    getTransactions({ month, categoryId, accountId: sp.account || undefined, q: sp.q || undefined }),
  ])
  const visible = sp.show === "all" ? rows : rows.filter((r) => !r.tx.isExcluded)
  const hidden = rows.length - visible.length
  const qs = (patch: Partial<Search>) => {
    const p = new URLSearchParams()
    const merged = { ...sp, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/expenses?${p.toString()}`
  }
  const withSpend = summary.categories.filter((c) => c.spent > 0 || c.monthlyTarget)

  return (
    <>
      <PageHeader title="הוצאות" sub="כל ההוצאות מכל החשבונות והכרטיסים, מסווגות אוטומטית.">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <Link href={qs({ month: addMonths(month, -1) })} className="rounded-full p-2 hover:bg-muted" aria-label="חודש קודם">
            <ChevronRight className="size-4" />
          </Link>
          <span className="min-w-[120px] text-center text-sm font-bold">{monthLabelHe(month)}</span>
          <Link href={qs({ month: addMonths(month, 1) })} className="rounded-full p-2 hover:bg-muted" aria-label="חודש הבא">
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </PageHeader>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">סה״כ הוצאות</div>
          <div className="mt-1 text-[28px] font-black">{formatILS(summary.spent)}</div>
          <div className="text-[13px] text-muted-foreground">מתוך יעד {formatILS(summary.spendingTarget)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">נשאר ביעד</div>
          <div className={cn("mt-1 text-[28px] font-black", summary.remaining < 0 ? "text-destructive" : "text-green")}>{formatILS(summary.remaining)}</div>
          <div className="text-[13px] text-muted-foreground">{summary.daysLeft > 0 ? `${summary.daysLeft} ימים נותרו` : "החודש הסתיים"}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-bold text-muted-foreground">לא מסווג</div>
          <div className="mt-1 text-[28px] font-black">{formatILS(summary.uncategorised)}</div>
          <div className="text-[13px] text-muted-foreground">נספר בהוצאות עד לסיווג</div>
        </Card>
        <Link href="/review" className="block">
          <Card className={cn("h-full p-5 transition-colors hover:bg-amber-soft/60", summary.needsReviewCount > 0 && "border-amber/60 bg-amber-soft/40")}>
            <div className="text-[13px] font-bold text-muted-foreground">לבדיקה</div>
            <div className="mt-1 text-[28px] font-black">{summary.needsReviewCount}</div>
            <div className="text-[13px] text-amber-ink">עסקאות שצריך לסווג ←</div>
          </Card>
        </Link>
      </section>

      <SectionTitle title="לפי קטגוריה" />
      <CategoryCards month={month} rows={withSpend} categories={categories} />

      <SectionTitle title="עסקאות" />
      <Card>
        <form method="get" className="flex flex-wrap items-center gap-2.5">
          <input type="hidden" name="month" value={month} />
          <div className="relative grow">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="חיפוש לפי שם עסק או תיאור" className={cn(SELECT_CLS, "w-full pe-9")} />
          </div>
          <select name="cat" defaultValue={sp.cat ?? ""} className={SELECT_CLS} aria-label="קטגוריה">
            <option value="">כל הקטגוריות</option>
            {categories
              .filter((c) => c.kind === "expense")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nameHe}
                </option>
              ))}
          </select>
          <select name="account" defaultValue={sp.account ?? ""} className={SELECT_CLS} aria-label="מקור">
            <option value="">כל המקורות</option>
            {accountsRows.map((r) => (
              <option key={r.account.id} value={r.account.id}>
                {accountLabel(r.account)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <input type="checkbox" name="show" value="all" defaultChecked={sp.show === "all"} className="size-4 accent-green" />
            הצג גם לא־הוצאות
          </label>
          <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
            סינון
          </button>
          {sp.q || sp.cat || sp.account || sp.show ? (
            <Link href={`/expenses?month=${month}`} className="text-sm text-muted-foreground underline">
              ניקוי
            </Link>
          ) : null}
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-2 text-start font-semibold">תאריך</th>
                <th className="py-2 text-start font-semibold">עסקה</th>
                <th className="py-2 text-start font-semibold">קטגוריה</th>
                <th className="hidden py-2 text-start font-semibold md:table-cell">מקור</th>
                <th className="py-2 text-end font-semibold">סכום</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    לא נמצאו עסקאות.
                  </td>
                </tr>
              ) : null}
              {visible.map(({ tx, account, category }) => (
                <tr key={tx.id} className={cn("border-t border-border", tx.isExcluded && "text-muted-foreground")}>
                  <td className="whitespace-nowrap py-3 pe-3 tabular-nums">{tx.transactionDate.slice(5).replace("-", "/")}</td>
                  <td className="py-3 pe-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{tx.merchantName || tx.description || "—"}</span>
                      {tx.needsReview ? <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-bold text-amber-ink">לבדיקה</span> : null}
                      {category?.slug === "groceries" && !tx.isExcluded ? <GroceryTag amount={tx.amount} /> : null}
                      {tx.installmentTotal ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                          תשלום {tx.installmentNumber}/{tx.installmentTotal}
                        </span>
                      ) : null}
                    </div>
                    {tx.details ? <div className="text-xs font-semibold text-foreground/75">{tx.details}</div> : null}
                    {tx.description && tx.merchantName && tx.description !== tx.merchantName ? <div className="text-xs text-muted-foreground">{tx.description}</div> : null}
                    {tx.note ? <div className="text-xs text-green-deep">הערה: {tx.note}</div> : null}
                  </td>
                  <td className="py-3 pe-3">
                    <div className="flex items-center gap-1">
                      <CategorySelect tx={tx} categories={categories} />
                      {tx.manualLock ? <UnlockButton id={tx.id} /> : null}
                    </div>
                    {tx.isExcluded ? <div className="mt-1 text-[11px]">{EXCLUSION_LABELS[tx.exclusionReason ?? "manual"]}</div> : null}
                  </td>
                  <td className="hidden py-3 pe-3 md:table-cell">{account ? accountLabel(account) : tx.providerId}</td>
                  <td className={cn("whitespace-nowrap py-3 text-end font-bold tabular-nums", tx.amount > 0 && !tx.isExcluded && "text-green")}>{formatILS(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hidden > 0 ? (
          <div className="mt-3 text-[13px] text-muted-foreground">
            {hidden} עסקאות שאינן הוצאה (חיובי כרטיס, העברות, הכנסות) מוסתרות.{" "}
            <Link href={qs({ show: "all" })} className="underline">
              הצגה
            </Link>
          </div>
        ) : null}
      </Card>
    </>
  )
}
