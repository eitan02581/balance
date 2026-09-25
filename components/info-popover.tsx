"use client"

import { Info } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** A small (i) that opens a short explanation. Works on touch too, unlike a hover tooltip. */
export function InfoPopover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`מה זה ${title}?`} className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm leading-relaxed">
        <div className="mb-1 font-extrabold">{title}</div>
        {children}
      </PopoverContent>
    </Popover>
  )
}
