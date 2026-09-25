import type { Metadata } from "next"
import { Heebo } from "next/font/google"

import "./globals.css"
import { DirectionProvider } from "@/components/ui/direction"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Balance",
  description: "הכסף שלא הוצאנו הופך להתקדמות למשהו שאנחנו רוצים",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={cn("antialiased font-sans", heebo.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <DirectionProvider dir="rtl">
          {children}
          <Toaster position="bottom-left" />
        </DirectionProvider>
      </body>
    </html>
  )
}
