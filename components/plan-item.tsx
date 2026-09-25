"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ExternalLink, StickyNote } from "lucide-react"
import { toast } from "sonner"

import { setActionDone, setActionNote } from "@/lib/actions"
import type { PlanItem } from "@/lib/plan"
import { cn } from "@/lib/utils"

export function PlanItemCard({ item, done: initialDone, note: initialNote, doneAt }: { item: PlanItem; done: boolean; note: string | null; doneAt: Date | null }) {
  const [done, setDone] = useState(initialDone)
  const [note, setNote] = useState(initialNote ?? "")
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  return (
    <div className={cn("rounded-3xl border border-[#edf0ee] bg-card p-5 shadow-card transition-opacity", done && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          disabled={pending}
          onClick={() => {
            const next = !done
            setDone(next)
            start(async () => {
              await setActionDone(item.key, next)
              toast.success(next ? "סומן כבוצע ✓" : "הוחזר לרשימה")
            })
          }}
          className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors", done ? "border-green bg-green text-white" : "border-border bg-card hover:border-green")}
        >
          {done ? "✓" : null}
        </button>
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("font-extrabold", done && "line-through")}>{item.title}</div>
            {item.owner ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{item.owner}</span> : null}
            {item.savings ? <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-bold text-green-deep">{item.savings}</span> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm">
            {item.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.links?.map((l) =>
              l.url.startsWith("/") ? (
                <Link key={l.url} href={l.url} className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-muted">
                  {l.label}
                </Link>
              ) : (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-muted">
                  {l.label} <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ),
            )}
            <button type="button" onClick={() => setEditing((e) => !e)} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground">
              <StickyNote className="size-3.5" /> {note ? "הערה" : "הוסיפו הערה"}
            </button>
          </div>
          {editing ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                start(async () => {
                  await setActionNote(item.key, note)
                  setEditing(false)
                  toast.success("ההערה נשמרה")
                })
              }}
            >
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: דיברתי עם MAX, מחכה לתשובה עד 1.10" className="h-10 grow rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
              <button type="submit" disabled={pending} className="h-10 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">
                שמירה
              </button>
            </form>
          ) : note ? (
            <div className="mt-2 rounded-xl bg-amber-soft/60 px-3 py-2 text-[13px] text-amber-ink">{note}</div>
          ) : null}
          {done && doneAt ? <div className="mt-2 text-[11px] text-muted-foreground">בוצע ב־{doneAt.toLocaleDateString("he-IL")}</div> : null}
        </div>
      </div>
    </div>
  )
}
