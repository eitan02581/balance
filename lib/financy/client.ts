import { env } from "@/lib/env"
import type { FinancyPage } from "./types"

const OAUTH_URL = "https://api.open-finance.ai/oauth/token"
const BASE_URL = "https://api.open-finance.ai/v2"

let cachedToken: { accessToken: string; expiresAt: number } | null = null

export async function getToken() {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 5 * 60_000) return cachedToken.accessToken
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: env("FINANCY_CLIENT_ID"), clientSecret: env("FINANCY_CLIENT_SECRET"), userId: env("FINANCY_USER_ID") }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Financy token failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { accessToken: string; expiresIn?: number }
  cachedToken = { accessToken: data.accessToken, expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000 }
  return cachedToken.accessToken
}

export async function financyGet<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(BASE_URL + path)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v))
  const token = await getToken()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  if (!res.ok) throw new Error(`Financy GET ${path} failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/** Follows `nextPage` cursors until exhausted. */
export async function fetchAll<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const items: T[] = []
  let nextPage: string | null | undefined
  let guard = 0
  do {
    const page = await financyGet<FinancyPage<T>>(path, { ...params, nextPage: nextPage ?? undefined })
    items.push(...(page.items ?? []))
    nextPage = page.nextPage
  } while (nextPage && ++guard < 200)
  return items
}
