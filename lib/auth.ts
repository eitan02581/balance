import { createHash, timingSafeEqual } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"

import { isDemo } from "@/lib/demo"
import { env } from "@/lib/env"

export const SESSION_COOKIE = "balance_session"
const SESSION_DAYS = 30
const MIN_PASSWORD_LENGTH = 12
// demo sessions are minted for anyone, so a demo token must never be accepted by a real deployment
const audience = () => (isDemo() ? "balance-demo" : "balance")

function secret() {
  return new TextEncoder().encode(env("SESSION_SECRET"))
}

/** Constant-time comparison that also hides the length (both sides are hashed first). */
export function safeEqual(a: string, b: string) {
  const h = (x: string) => createHash("sha256").update(x).digest()
  return timingSafeEqual(h(a), h(b))
}

export function checkPassword(input: string) {
  const expected = env("HOUSEHOLD_PASSWORD")
  // one shared password guards everything, so refuse to run with a guessable one
  if (expected.length < MIN_PASSWORD_LENGTH) throw new Error(`HOUSEHOLD_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`)
  return safeEqual(input, expected)
}

export async function createSessionToken() {
  return new SignJWT({ v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret())
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false
  try {
    await jwtVerify(token, secret(), { audience: audience(), algorithms: ["HS256"] })
    return true
  } catch {
    return false
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
}
