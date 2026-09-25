"use client"

import { useActionState } from "react"

import { login } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" })
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">סיסמת הבית</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="h-11" />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="h-11 rounded-xl font-bold">
        {pending ? "רגע…" : "כניסה"}
      </Button>
    </form>
  )
}
