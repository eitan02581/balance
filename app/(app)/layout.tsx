import { AppShell } from "@/components/app-shell"
import { isDemo } from "@/lib/demo"
import { getInsightCount } from "@/lib/insights"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const insightCount = await getInsightCount()
  return <AppShell insightCount={insightCount} demo={isDemo()}>{children}</AppShell>
}
