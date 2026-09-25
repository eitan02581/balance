"use client"

import { useState, useTransition } from "react"
import { Check, Dumbbell } from "lucide-react"
import { toast } from "sonner"

import { gymCheckIn } from "@/lib/actions"
import { formatILS } from "@/lib/money"
import { cn } from "@/lib/utils"

const PIECES = ["💪", "✨", "🏋️", "🎉", "💚", "⭐", "🔥", "🏆"]

export function GymCheckIn({ todayChecked, reward }: { todayChecked: boolean; reward: number }) {
  const [pending, start] = useTransition()
  const [burst, setBurst] = useState<number | null>(null)
  const [done, setDone] = useState(todayChecked)
  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending || done}
        onClick={() =>
          start(async () => {
            const r = await gymCheckIn()
            if (r.ok) {
              setDone(true)
              setBurst(Date.now())
              toast.success(`כל הכבוד! ${formatILS(r.reward, { sign: true })} לפינוק 🎉`)
            } else toast("היום כבר נרשם. נתראה מחר 💪")
          })
        }
        className={cn(
          "relative flex w-full items-center justify-center gap-3 rounded-3xl px-6 py-6 text-xl font-black transition-all",
          done ? "bg-soft text-green-deep" : "bg-lime text-sidebar-dark shadow-[0_10px_30px_rgba(201,236,134,0.5)] hover:brightness-95 active:scale-[0.99]",
        )}
      >
        {done ? <Check className="size-6" /> : <Dumbbell className="size-6" />}
        {done ? "האימון של היום נרשם" : `היה אימון · ${formatILS(reward, { sign: true })}`}
      </button>
      {burst ? (
        <div key={burst} className="balance-burst pointer-events-none absolute inset-0 overflow-visible text-2xl" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2
            const dist = 90 + (i % 3) * 40
            return (
              <span key={i} style={{ "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist - 40}px`, "--rot": `${(i % 2 ? 1 : -1) * 120}deg`, animationDelay: `${(i % 4) * 40}ms` } as React.CSSProperties}>
                {PIECES[i % PIECES.length]}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
