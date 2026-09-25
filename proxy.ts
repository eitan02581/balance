import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/auth"
import { isDemo } from "@/lib/demo"

export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (ok) return NextResponse.next()
  if (isDemo()) {
    const res = NextResponse.next()
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions)
    return res
  }
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  // public assets: favicon/app icons, manifest, provider logos — fetched without cookies by browsers and iOS
  matcher: ["/((?!(?:login|favicon\\.ico|icon\\.svg|apple-icon\\.png|icon-192\\.png|icon-512\\.png|manifest\\.webmanifest)$|login/|api/cron/|_next/static/|_next/image|logos/).*)"],
}
