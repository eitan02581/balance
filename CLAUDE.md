@AGENTS.md

# Balance: notes for Claude Code

First time here? Run `/setup` (see `.claude/commands/setup.md`); it walks through the whole install.

## Stack

Next.js 16 (App Router, `proxy.ts` instead of middleware) · React 19 · Tailwind 4 + shadcn/ui · Drizzle ORM on Neon Postgres · Financy / Open Finance API for bank and card data · Vercel Hobby (one cron a day). UI is Hebrew, RTL only.

## Commands

- `npm run dev` · `npm test` (vitest) · `npm run typecheck`
- `npm run db:push` (schema → Neon) · `npm run db:seed` · `npm run seed:demo` (fake data, only into a DB named `balance_demo`)
- `npm run sync` (last 45 days; `-- --full` = 12 months; `-- --reclassify` re-runs rules without calling Financy) · `npm run probe`
- `npm run lint` is currently broken (ESLint 10 vs eslint-plugin-react). Use `typecheck` + `test`.

## Code conventions

- Don't reformat files with Prettier: the code is not Prettier-formatted (long single lines) despite `.prettierrc`.
- Pure helpers live in `lib/`. Never export helpers from a `"use client"` file and call them from a server component (it crashes in production).
- Server actions passed to client forms: use `action.bind(null, args)`, not inline `async () => action()`.
- Signed amounts go through `formatILS` (it wraps them in LRI…PDI so the minus sign renders correctly in RTL).
- Hebrew regexes need lookarounds instead of `\b` (e.g. "ביט" must not match inside "ביטוח").

## Product rules

- A category limit is a **ceiling** ("תקרה"), never an allowance: don't show "left to spend" amounts.
- Keep scope to the core loop: see where money goes, spend less, move the difference to a shared goal.
- Secrets only in `.env.local` / Vercel env. Never commit personal data.

## Financy data quirks

- Bank rows have `transactionDate = null` → use `bookingDate`. Some amounts are `""` → coerce; an empty `chargedAmount` means ₪0 charged.
- Card holds arrive as `status=PENDING`; the settled charge comes later as a new id with `status=BOOKED`. Sync drops a pending row once its booked twin exists.
- Bank-side debits for card bills are excluded (the card purchases are the expenses). Unknown bank debits wait in review (`exclusionReason=unreviewed`).
- Never call Financy's paid refresh endpoint.
