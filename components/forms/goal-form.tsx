"use client"

import { useState } from "react"

import type { Goal } from "@/db/schema"
import { createGoal, updateGoal } from "@/lib/actions"
import { ActionForm } from "@/components/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const PRESETS = [
  { emoji: "✈️", label: "חופשה" },
  { emoji: "🏠", label: "בית" },
  { emoji: "🚗", label: "רכב" },
  { emoji: "🛟", label: "קרן חירום" },
  { emoji: "✨", label: "אחר" },
]

export function GoalForm({ goal }: { goal?: Goal }) {
  const [emoji, setEmoji] = useState(goal?.emoji ?? "✈️")
  return (
    <ActionForm action={goal ? updateGoal : createGoal} success={goal ? "היעד עודכן ✓" : "היעד נוצר ✓"} className="flex flex-col gap-5">
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <input type="hidden" name="emoji" value={emoji} />
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.emoji}
            type="button"
            onClick={() => setEmoji(p.emoji)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border bg-card py-3 text-xs font-semibold transition-colors",
              emoji === p.emoji ? "border-green ring-3 ring-soft" : "border-border hover:bg-muted",
            )}
          >
            <span className="text-2xl">{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">שם היעד</Label>
        <Input id="name" name="name" defaultValue={goal?.name ?? ""} placeholder="למשל: חופשה משפחתית" required className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetAmount">סכום היעד (₪)</Label>
        <Input id="targetAmount" name="targetAmount" type="number" inputMode="numeric" min={1} defaultValue={goal?.targetAmount ?? ""} placeholder="20000" required className="h-11" />
      </div>
      {!goal ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="initialAmount">כבר שמור ליעד הזה (₪, לא חובה)</Label>
            <Input id="initialAmount" name="initialAmount" type="number" inputMode="numeric" min={0} placeholder="0" className="h-11" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="makeDefault" defaultChecked className="size-4 accent-green" />
            העודף החודשי הולך ליעד הזה
          </label>
        </>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="rounded-xl font-bold">
          {goal ? "שמירה" : "יצירת יעד"}
        </Button>
      </div>
    </ActionForm>
  )
}
