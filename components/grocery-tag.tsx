import { Plus, ShoppingCart } from "lucide-react"

import { GROCERY_MAIN_THRESHOLD } from "@/lib/month"
import { cn } from "@/lib/utils"

/** Supermarket purchase kind: a main shop (≥ threshold) vs a top-up. Two clearly different looks. */
export function GroceryTag({ amount, className }: { amount: number; className?: string }) {
  if (amount >= 0) return null
  const main = -amount >= GROCERY_MAIN_THRESHOLD
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
        main ? "border-green-deep/30 bg-green text-white" : "border-[#d9a83a] bg-amber text-[#3f2d05]",
        className,
      )}
    >
      {main ? <ShoppingCart className="size-3" /> : <Plus className="size-3" />}
      {main ? "קנייה גדולה" : "השלמה"}
    </span>
  )
}
