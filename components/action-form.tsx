"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

type Action = (formData: FormData) => Promise<unknown>

/** A <form> that runs a server action, confirms with a toast, and dims itself while pending. */
export function ActionForm({ action, success = "נשמר ✓", className, children, reset = false }: { action: Action; success?: string; className?: string; children: React.ReactNode; reset?: boolean }) {
  const [pending, start] = useTransition()
  return (
    <form
      className={cn(className, pending && "pointer-events-none opacity-60")}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        start(async () => {
          try {
            await action(fd)
            toast.success(success)
            if (reset) form.reset()
          } catch (err) {
            // a redirect() inside the action surfaces as a special error; that's success, not failure
            if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw err
            toast.error("משהו השתבש, נסו שוב")
            console.error(err)
          }
        })
      }}
    >
      {children}
    </form>
  )
}
