import { redirect } from "next/navigation"

import { LoginForm } from "@/components/forms/login-form"
import { isDemo } from "@/lib/demo"

export default function LoginPage() {
  if (isDemo()) redirect("/")
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-lime text-lg font-black text-sidebar-dark">B</div>
          <div>
            <div className="text-xl font-extrabold">Balance</div>
            <div className="text-sm text-muted-foreground">הכספים שלנו, במקום אחד</div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
