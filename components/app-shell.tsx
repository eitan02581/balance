"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, CalendarDays, CreditCard, Dumbbell, Home, Lightbulb, ListChecks, Menu, Ruler, Settings, Target } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"

const NAV = [
  { href: "/", label: "הבית שלנו", icon: Home },
  { href: "/expenses", label: "הוצאות", icon: BarChart3, also: ["/review"] },
  { href: "/accounts", label: "חשבונות וכרטיסים", icon: CreditCard },
  { href: "/baseline", label: "הבסיס שלנו", icon: Ruler },
  { href: "/insights", label: "תובנות", icon: Lightbulb, badge: true },
  { href: "/plan", label: "צעדים", icon: ListChecks },
  { href: "/goals", label: "יעדים", icon: Target, also: ["/month-close"] },
  { href: "/gym", label: "בונוסים", icon: Dumbbell },
  { href: "/history", label: "היסטוריה", icon: CalendarDays },
  { href: "/settings", label: "הגדרות", icon: Settings },
]

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.href === "/") return pathname === "/"
  return pathname.startsWith(item.href) || (item.also ?? []).some((p) => pathname.startsWith(p))
}

function Brand({ demo }: { demo: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2 text-xl font-extrabold text-white">
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-lime text-lg font-black text-sidebar-dark">B</span>
      Balance
      {demo ? <span className="rounded-full bg-lime/20 px-2 py-0.5 text-[11px] font-black text-lime">דמו</span> : null}
    </Link>
  )
}

function NavList({ pathname, insightCount, onNavigate }: { pathname: string; insightCount: number; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition-colors",
              active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
            )}
          >
            <item.icon className="size-5" />
            <span className="grow">{item.label}</span>
            {"badge" in item && item.badge && insightCount > 0 ? <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-black text-sidebar-dark">{insightCount}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}

const MISSION = (
  <div className="mt-auto rounded-2xl bg-white/7 p-4 text-[13px] leading-relaxed text-white/80">
    <div className="mb-1 font-extrabold text-lime">המטרה</div>
    להפוך כסף שלא הוצאנו להתקדמות מוחשית למשהו שאנחנו רוצים.
  </div>
)

export function AppShell({ children, insightCount = 0, demo = false }: { children: React.ReactNode; insightCount?: number; demo?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname]) // close the drawer after navigating
  const current = NAV.find((i) => isActive(pathname, i))

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-7 bg-sidebar-dark px-4 py-7 text-white lg:flex">
        <Brand demo={demo} />
        <NavList pathname={pathname} insightCount={insightCount} />
        {MISSION}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-sidebar-dark px-3 text-white shadow-[0_6px_20px_rgba(25,42,31,0.18)] lg:hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <Brand demo={demo} />
        <div className="flex items-center gap-2">
          {current ? <span className="text-[13px] font-semibold text-white/70">{current.label}</span> : null}
          <button type="button" aria-label="תפריט" onClick={() => setOpen(true)} className="relative flex size-11 items-center justify-center rounded-xl hover:bg-white/10">
            <Menu className="size-6" />
            {insightCount > 0 ? <span className="absolute -end-0.5 -top-0.5 rounded-full bg-lime px-1.5 text-[10px] font-black text-sidebar-dark">{insightCount}</span> : null}
          </button>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] border-0 bg-sidebar-dark p-0 text-white [&>button]:text-white">
          <SheetTitle className="sr-only">תפריט</SheetTitle>
          <SheetDescription className="sr-only">ניווט בין עמודי Balance</SheetDescription>
          <div className="flex h-full flex-col gap-7 px-4 py-7">
            <Brand demo={demo} />
            <NavList pathname={pathname} insightCount={insightCount} onNavigate={() => setOpen(false)} />
            {MISSION}
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto w-full max-w-[1450px] px-4 pb-12 pt-5 sm:px-6 lg:px-9 lg:pt-8">{children}</main>
    </div>
  )
}
