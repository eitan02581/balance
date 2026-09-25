"use client"

import { useState, useTransition } from "react"
import { Check, ChevronDown, Eye, EyeOff, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import type { Category, Transaction } from "@/db/schema"
import { classifyTransaction, recountTransaction, setTransactionNote, unlockTransaction } from "@/lib/actions"
import { dateLabelHe, formatILS } from "@/lib/money"
import { EXCLUSION_LABELS } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export const SELECT_CLS =
  "h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"

export function currentChoice(tx: Pick<Transaction, "balanceCategoryId" | "isExcluded" | "exclusionReason">) {
  if (tx.isExcluded && tx.exclusionReason === "income" && tx.balanceCategoryId != null) return `inc:${tx.balanceCategoryId}`
  if (tx.isExcluded) return `ex:${tx.exclusionReason ?? "manual"}`
  if (tx.balanceCategoryId != null) return `cat:${tx.balanceCategoryId}`
  return ""
}

/**
 * Category picker: a searchable combobox. Type to filter, arrows to move, Enter to pick.
 * The popover measures the viewport and opens upward when there is no room below.
 */
export function CategoryPicker({ value, onChange, categories, placeholder = "בחרו קטגוריה", className, disabled }: { value: string; onChange: (v: string) => void; categories: Category[]; placeholder?: string; className?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const expense = categories.filter((c) => c.kind === "expense")
  const income = categories.filter((c) => c.kind === "income")
  const label = value.startsWith("cat:") || value.startsWith("inc:")
    ? (() => {
        const c = categories.find((c) => `${value.slice(0, 3)}:${c.id}` === value)
        return c ? `${c.emoji} ${c.nameHe}` : placeholder
      })()
    : value.startsWith("ex:")
      ? (EXCLUSION_LABELS[value.slice(3)] ?? placeholder)
      : placeholder
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="קטגוריה"
          disabled={disabled}
          className={cn(SELECT_CLS, "flex items-center justify-between gap-2 text-start disabled:opacity-50", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] max-h-[min(380px,var(--radix-popover-content-available-height))] overflow-hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command loop className="relative max-h-[inherit]">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 rounded-b-lg bg-linear-to-t from-popover to-transparent" aria-hidden />
          <CommandInput autoFocus placeholder="חיפוש קטגוריה…" />
          <CommandList className="max-h-[300px] overflow-y-auto [scrollbar-width:thin]! [scrollbar-color:var(--muted-ink)_transparent] [&::-webkit-scrollbar]:w-2! [&::-webkit-scrollbar]:block! [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-ink/40">
            <CommandEmpty>לא נמצא</CommandEmpty>
            <CommandGroup heading="הוצאה">
              {expense.map((c) => (
                <CommandItem key={c.id} value={`${c.emoji} ${c.nameHe} ${c.slug}`} onSelect={() => pick(`cat:${c.id}`)}>
                  <span className="grow">
                    {c.emoji} {c.nameHe}
                  </span>
                  {value === `cat:${c.id}` ? <Check className="size-4 text-green" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="הכנסה">
              {income.map((c) => (
                <CommandItem key={c.id} value={`${c.emoji} ${c.nameHe} ${c.slug} הכנסה`} onSelect={() => pick(`inc:${c.id}`)}>
                  <span className="grow">
                    {c.emoji} {c.nameHe}
                  </span>
                  {value === `inc:${c.id}` ? <Check className="size-4 text-green" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="לא הוצאה">
              {Object.entries(EXCLUSION_LABELS).filter(([k]) => k !== "income").map(([k, v]) => (
                <CommandItem key={k} value={`${v} ${k}`} onSelect={() => pick(`ex:${k}`)}>
                  <span className="grow">{v}</span>
                  {value === `ex:${k}` ? <Check className="size-4 text-green" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Inline category select that saves immediately. */
export function CategorySelect({ tx, categories, remember = true, onSaved }: { tx: Transaction; categories: Category[]; remember?: boolean; onSaved?: () => void }) {
  const [pending, start] = useTransition()
  const [value, setValue] = useState(currentChoice(tx))
  return (
    <CategoryPicker
      value={value}
      categories={categories}
      disabled={pending}
      className="w-full max-w-[220px]"
      onChange={(v) => {
        if (!v) return
        setValue(v)
        start(async () => {
          await classifyTransaction({ id: tx.id, choice: v, remember })
          toast.success(remember ? "עודכן לכל העסקאות של הספק הזה" : "נשמר")
          onSaved?.()
        })
      }}
    />
  )
}

/** Context under a transaction: when & where as chips, then the payee/purpose line, then the Financy tag. */
export function TxMeta({ tx, source }: { tx: Transaction; source: string }) {
  return (
    <div className="mt-1.5 flex flex-col gap-1.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold text-foreground/80">{dateLabelHe(tx.transactionDate)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold text-foreground/80">{source}</span>
        {tx.installmentTotal ? <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold text-foreground/80">תשלום {tx.installmentNumber}/{tx.installmentTotal}</span> : null}
        {tx.note ? <span className="rounded-full bg-soft px-2 py-0.5 text-[12px] font-bold text-green-deep">{tx.note}</span> : null}
      </div>
      {tx.details ? <div className="font-semibold text-foreground/85">{tx.details}</div> : null}
      {tx.description && tx.merchantName && tx.description !== tx.merchantName ? <div className="text-muted-foreground">{tx.description}</div> : null}
    </div>
  )
}

/** Toggle: "לא נספר" takes the row out of every calculation; "ספור שוב" puts it back in its category. */
export function CountToggle({ tx, onDone }: { tx: Pick<Transaction, "id" | "isExcluded" | "exclusionReason">; onDone?: () => void }) {
  const [pending, start] = useTransition()
  const notCounted = tx.isExcluded && tx.exclusionReason === "manual"
  return (
    <button
      type="button"
      disabled={pending}
      title={notCounted ? "לספור שוב בהוצאות" : "לא לספור בהוצאות"}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold disabled:opacity-50",
        notCounted ? "border-green bg-soft text-green-deep hover:bg-[#dcefe3]" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={() =>
        start(async () => {
          if (notCounted) {
            await recountTransaction(tx.id)
            toast.success("נספר שוב")
          } else {
            await classifyTransaction({ id: tx.id, choice: "ex:manual", remember: false })
            toast.success("סומן כלא נספר")
          }
          onDone?.()
        })
      }
    >
      {notCounted ? <Eye className="size-4" /> : <EyeOff className="size-4" />} {notCounted ? "ספור שוב" : "לא נספר"}
    </button>
  )
}

/** Free-text note on a row; saves on blur or Enter, only when changed. */
export function NoteInput({ tx, className }: { tx: Pick<Transaction, "id" | "note">; className?: string }) {
  const [pending, start] = useTransition()
  const [value, setValue] = useState(tx.note ?? "")
  const save = () => {
    if (value.trim() === (tx.note ?? "")) return
    start(async () => {
      await setTransactionNote(tx.id, value)
      toast.success("ההערה נשמרה")
    })
  }
  return (
    <input
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
      }}
      placeholder="הערה (למשל: החזר מחבר)"
      aria-label="הערה"
      className={cn(SELECT_CLS, className)}
    />
  )
}

export function UnlockButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      title="חזרה לסיווג אוטומטי"
      aria-label="חזרה לסיווג אוטומטי"
      disabled={pending}
      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => start(async () => unlockTransaction(id))}
    >
      <RotateCcw className="size-4" />
    </button>
  )
}

/** Review-queue item: choose, optionally remember, save. Disappears after saving. */
export function ReviewItem({ tx, source, categories, compact = false }: { tx: Transaction; source: string; categories: Category[]; compact?: boolean }) {
  const [pending, start] = useTransition()
  const [choice, setChoice] = useState("")
  const [remember, setRemember] = useState(true)
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)
  if (done) return null
  const title = tx.merchantName || tx.description || "עסקה ללא שם"
  const save = (c: string) =>
    start(async () => {
      await classifyTransaction({ id: tx.id, choice: c, remember, note })
      toast.success(c === "ex:manual" ? "סומן כלא נספר" : "סווג")
      setDone(true)
    })
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4", !compact && "lg:flex-row lg:items-start lg:gap-4")}>
      <div className="min-w-0 grow">
        <div className="flex items-baseline justify-between gap-3">
          <div className="truncate text-[15px] font-bold">{title}</div>
          <div className={cn("shrink-0 text-lg font-black tabular-nums", tx.amount > 0 && "text-green")}>{formatILS(tx.amount)}</div>
        </div>
        <TxMeta tx={tx} source={source} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryPicker value={choice} onChange={setChoice} categories={categories} className="min-w-[180px]" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה (למשל: מתנה)" className={cn(SELECT_CLS, "w-40")} />
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-green" />
          זכרו
        </label>
        <button type="button" disabled={!choice || pending} className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50" onClick={() => save(choice)}>
          <Check className="size-4" /> שמירה
        </button>
        <button type="button" disabled={pending} title="לא לספור בהוצאות" className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" onClick={() => save("ex:manual")}>
          <EyeOff className="size-4" /> לא נספר
        </button>
      </div>
    </div>
  )
}
