import { cn } from "@/lib/utils"

const FILL = { ok: "bg-green", warn: "bg-amber", hot: "bg-coral", none: "bg-green" } as const

export function Bar({ pct, state = "ok", className }: { pct: number; state?: keyof typeof FILL; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", FILL[state])} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function ProgressRow({ label, spent, target, pct, state }: { label: string; spent: string; target: string | null; pct: number; state: keyof typeof FILL }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <b>
          {spent}
          {target ? <span className="font-medium text-muted-foreground"> / {target}</span> : null}
        </b>
      </div>
      <Bar pct={pct} state={state} />
    </div>
  )
}
