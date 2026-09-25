import { NextResponse } from "next/server"

import { safeEqual } from "@/lib/auth"
import { env } from "@/lib/env"
import { runSync } from "@/lib/financy/sync"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (!safeEqual(auth ?? "", `Bearer ${env("CRON_SECRET")}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
