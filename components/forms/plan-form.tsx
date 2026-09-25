"use client"

import { useState } from "react"

import type { Goal, MonthlyPlan } from "@/db/schema"
import { savePlan } from "@/lib/actions"
import { formatILS } from "@/lib/money"
import { ActionForm } from "@/components/action-form"
import { SELECT_CLS } from "@/components/transaction-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function PlanForm({ plan, goals, categoriesSum, month }: { plan: MonthlyPlan; goals: Goal[]; categoriesSum: number; month: string }) {
  const [fromCategories, setFromCategories] = useState(plan.spendingFromCategories)
  return (
    <ActionForm action={savePlan} success="התוכנית נשמרה ✓" className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="spendingFromCategories" value={fromCategories ? "on" : "off"} />
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
        <div>
          <Label htmlFor="fromCategories" className="text-sm font-bold">
            יעד ההוצאות = סכום יעדי הקטגוריות
          </Label>
          <div className="mt-0.5 text-[12px] text-muted-foreground">כרגע {formatILS(categoriesSum)}. משתנה אוטומטית כשמעדכנים יעד לקטגוריה.</div>
        </div>
        <Switch id="fromCategories" checked={fromCategories} onCheckedChange={setFromCategories} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="spendingTarget">יעד הוצאות חודשי (₪)</Label>
        <Input
          id="spendingTarget"
          name="spendingTarget"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={plan.spendingTarget}
          disabled={fromCategories}
          className="h-11 disabled:opacity-50"
        />
        {fromCategories ? <div className="text-[12px] text-muted-foreground">מחושב מהקטגוריות: {formatILS(categoriesSum)}. כבו את המתג כדי להזין מספר אחר.</div> : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="savingsTarget">יעד חיסכון בסיסי (₪)</Label>
        <Input id="savingsTarget" name="savingsTarget" type="number" inputMode="numeric" min={0} defaultValue={plan.savingsTarget} className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="defaultGoalId">העודף הולך ל…</Label>
        <select id="defaultGoalId" name="defaultGoalId" defaultValue={plan.defaultGoalId ?? ""} className={SELECT_CLS}>
          <option value="">בלי יעד</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.emoji} {g.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="self-start rounded-xl font-bold">
        שמירת התוכנית
      </Button>
    </ActionForm>
  )
}
