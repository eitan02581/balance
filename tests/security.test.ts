import { afterEach, describe, expect, it } from "vitest"

import { checkPassword, createSessionToken, safeEqual, verifySessionToken } from "@/lib/auth"
import { isDemo } from "@/lib/demo"
import { config } from "../proxy"

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

const REAL_DB = "postgresql://u:p@host/neondb"
const DEMO_DB = "postgresql://u:p@host/balance_demo"

describe("demo mode", () => {
  it("is on only with DEMO_MODE=1 and a database named balance_demo", () => {
    Object.assign(process.env, { DEMO_MODE: "1", DATABASE_URL: DEMO_DB })
    expect(isDemo()).toBe(true)
    process.env.DATABASE_URL = REAL_DB // DEMO_MODE left on by mistake on a real database
    expect(isDemo()).toBe(false)
    Object.assign(process.env, { DEMO_MODE: "", DATABASE_URL: DEMO_DB })
    expect(isDemo()).toBe(false)
  })

  it("a demo session is rejected by a real deployment with the same secret", async () => {
    Object.assign(process.env, { SESSION_SECRET: "s".repeat(64), DEMO_MODE: "1", DATABASE_URL: DEMO_DB })
    const demoToken = await createSessionToken()
    expect(await verifySessionToken(demoToken)).toBe(true)
    Object.assign(process.env, { DEMO_MODE: "", DATABASE_URL: REAL_DB })
    expect(await verifySessionToken(demoToken)).toBe(false)
    expect(await verifySessionToken(await createSessionToken())).toBe(true)
  })
})

describe("password", () => {
  it("refuses to run with a short household password", () => {
    process.env.HOUSEHOLD_PASSWORD = "short"
    expect(() => checkPassword("short")).toThrow(/at least 12/)
  })

  it("accepts only the exact password", () => {
    process.env.HOUSEHOLD_PASSWORD = "correct horse battery staple"
    expect(checkPassword("correct horse battery staple")).toBe(true)
    expect(checkPassword("correct horse battery")).toBe(false)
    expect(checkPassword("")).toBe(false)
  })

  it("safeEqual compares values of different lengths without throwing", () => {
    expect(safeEqual("a", "a")).toBe(true)
    expect(safeEqual("a", "ab")).toBe(false)
  })
})

describe("proxy matcher", () => {
  // Next anchors the matcher to the whole pathname
  const re = new RegExp(`^${config.matcher[0]}$`)
  it("protects every page, including look-alikes of the public paths", () => {
    for (const p of ["/", "/settings", "/login-x", "/loginfoo", "/api/cronx", "/api/other", "/logosx"]) expect(re.test(p), p).toBe(true)
  })
  it("leaves the login page, cron endpoint and static assets public", () => {
    for (const p of ["/login", "/api/cron/sync", "/logos/max.jpeg", "/_next/static/chunk.js", "/favicon.ico", "/manifest.webmanifest"]) expect(re.test(p), p).toBe(false)
  })
})
