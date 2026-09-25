import { LogOut } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { PlanForm } from "@/components/forms/plan-form"
import { Card } from "@/components/cards"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logout, saveCategoryTargets } from "@/lib/actions"
import { monthKey, monthLabelHe } from "@/lib/money"
import { getCategories, getGoals, getMerchantRuleCount, getPlan } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const month = monthKey()
  const [plan, categories, goalsList, ruleCount] = await Promise.all([getPlan(month), getCategories(), getGoals(), getMerchantRuleCount()])
  const expense = categories.filter((c) => c.kind === "expense")

  return (
    <>
      <PageHeader title="הגדרות" sub="כמה שפחות. רק מה שמשנה את התמונה החודשית." />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="font-extrabold">התוכנית החודשית · {monthLabelHe(month)}</div>
          <p className="mt-1 text-[13px] text-muted-foreground">משתנה רק לחודש הזה. חודשים חדשים מתחילים מהערכים האחרונים.</p>
          <PlanForm plan={plan} goals={goalsList} categoriesSum={expense.reduce((t, c) => t + (c.monthlyTarget ?? 0), 0)} month={month} />
        </Card>

        <Card>
          <div className="font-extrabold">יעדים לקטגוריות</div>
          <p className="mt-1 text-[13px] text-muted-foreground">ריק = בלי יעד. הקטגוריה עדיין נספרת בהוצאות.</p>
          <ActionForm action={saveCategoryTargets} success="היעדים נשמרו ✓" className="mt-4 flex flex-col gap-3">
            {expense.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={`target_${c.id}`} className="text-sm">
                  {c.emoji} {c.nameHe}
                </Label>
                <Input id={`target_${c.id}`} name={`target_${c.id}`} type="number" inputMode="numeric" min={0} defaultValue={c.monthlyTarget ?? ""} placeholder="—" className="h-10 w-32 text-end" />
              </div>
            ))}
            <Button type="submit" className="mt-2 self-start rounded-xl font-bold">
              שמירת היעדים
            </Button>
          </ActionForm>
        </Card>

        <Card>
          <div className="font-extrabold">כללי נתונים</div>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            <li>לומדים מתיקונים: {ruleCount} כללי ספק שמורים.</li>
            <li>העברות פנימיות מזוהות אוטומטית ולא נספרות.</li>
            <li>חיובי כרטיס אשראי בבנק לא נספרים פעמיים.</li>
            <li>הנתונים נמשכים מ־Open Finance אוטומטית פעם ביום, ובכל כניסה אם עברו יותר מ־3 שעות.</li>
          </ul>
        </Card>

        <Card>
          <div className="font-extrabold">הבית</div>
          <p className="mt-2 text-sm text-muted-foreground">שניכם נכנסים עם אותה סיסמת בית ורואים את אותה תמונה. הסיסמה מוגדרת בהגדרות השרת (HOUSEHOLD_PASSWORD).</p>
          <form action={logout} className="mt-4">
            <Button type="submit" variant="outline" className="rounded-xl font-bold">
              <LogOut /> יציאה
            </Button>
          </form>
        </Card>
      </section>
    </>
  )
}
