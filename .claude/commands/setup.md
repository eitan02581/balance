---
description: Set up Balance from scratch — database, secrets, first sync, and (optionally) deploy to Vercel
---

You are setting up **Balance** (a Hebrew RTL household finance tracker) for the person running this command. Follow these steps in order. Keep it simple, explain each step in one line as you go, and stop to ask whenever you need something only the user has.

## Ground rules

- **Never invent, guess or autofill personal values** (names, emails, passwords, bank credentials). Ask the user.
- Secrets go only in `.env.local` (gitignored) and in Vercel env vars. Never write them into code, commits, or chat summaries.
- Don't pay for anything or pick paid plans. Everything here runs on free tiers except Financy (Open Finance), which the user buys themselves.
- If a CLI flag fails, run the command with `--help` and adapt instead of giving up.

## 0. Pick a path

Ask the user (AskUserQuestion) which path they want:

- **Demo**: fake household data, no bank connection, free. Good for trying it out.
- **Real data**: connects their banks and cards through Financy / Open Finance (paid, and they must already have an account with API access).

## 1. Prerequisites

- `node -v` must be 20 or newer. If not, tell the user how to install it (https://nodejs.org) and stop.
- `npm install`

## 2. Database (Neon, free tier)

Create a Neon Postgres project with the Neon CLI:

1. `npx neonctl@latest auth`: opens the browser once so the user can sign in or sign up (free). Wait for them to finish.
2. If the account has more than one Neon organization, the CLI stops to ask which one. Run neonctl commands with `</dev/null` so they never hang on a prompt; list the orgs with `npx neonctl@latest orgs list`, ask the user which to use, and pass `--org-id <org>` from then on.
3. `npx neonctl@latest projects create --name balance --region-id aws-eu-central-1 --output json`: Frankfurt is the closest region to Israel. Note the project id.
4. `npx neonctl@latest connection-string --project-id <id> --database-name neondb --pooled`: this is `DATABASE_URL`. Always pass `--database-name`; once a project has two databases the command prints nothing without it.

**Demo path only**: the demo seeder refuses any database not named `balance_demo`, so also:

5. `npx neonctl@latest databases create --project-id <id> --name balance_demo`
6. `npx neonctl@latest connection-string --project-id <id> --database-name balance_demo --pooled`: use this for **both** `DATABASE_URL` and `DEMO_DATABASE_URL`. (Demo mode only switches on when `DATABASE_URL` points at a database named `balance_demo`.)

If the CLI route fails, have the user create a project at https://console.neon.tech and paste the **pooled** connection string.

## 3. `.env.local`

Copy `.env.example` to `.env.local` and fill it:

- `DATABASE_URL` (and, on the demo path, `DEMO_DATABASE_URL` + `DEMO_MODE=1`) from step 2.
- `SESSION_SECRET` and `CRON_SECRET`: generate each with `openssl rand -hex 32`. Don't ask the user for these.
- `HOUSEHOLD_PASSWORD`: **ask the user** to choose the shared login password: **at least 12 characters** (the app refuses shorter ones), ideally a few random words. Real-data path only; the demo path skips login.
- `FINANCY_CLIENT_ID`, `FINANCY_CLIENT_SECRET`, `FINANCY_USER_ID`: **real-data path only; ask the user** to paste them from the Financy app (Settings → API). Never proceed with placeholders.

## 4. Tables and defaults

```bash
npm run db:push   # create tables
npm run db:seed   # categories, a default goal and this month's plan
```

Demo path only: `npm run seed:demo` (fills ~5 months of fake data; re-running resets it).

## 5. Real-data path only: first sync

```bash
npm run probe          # checks Financy access; prints connections, accounts and sample rows
npm run sync -- --full # pulls the last 12 months
```

If `probe` fails with an auth error, the Financy keys are wrong. Ask the user to re-check them and don't retry blindly.

## 6. Run it

`npm run dev`, then tell the user to open http://localhost:3000 (the real-data path logs in with `HOUSEHOLD_PASSWORD`). Verify the home page renders with no error before moving on.

## 7. Deploy to Vercel (optional, free Hobby plan)

Ask first. If yes:

1. `npx vercel@latest login` (the user signs in once), then `npx vercel@latest link --yes`.
2. Use fresh `SESSION_SECRET` / `CRON_SECRET` values for each deployment (never reuse the demo's). Add every non-empty variable from `.env.local` to production, one by one, reading values from the file (don't echo them into chat):
   `printf '%s' "$VALUE" | npx vercel@latest env add NAME production`
3. `npx vercel@latest --prod --yes`
4. Open the production URL. If it asks for a Vercel login, the user must turn off **Vercel Authentication** in Project Settings → Deployment Protection.

`vercel.json` already schedules a daily sync at `/api/cron/sync` (Hobby allows one cron a day). The app also syncs on visit when data is older than 3 hours.

## 8. Wrap up

Summarize what was set up (never print secret values), the local and production URLs, and the next steps from the README's "Make it yours" section: rename accounts on /accounts, set category ceilings and the monthly plan on /settings, and edit the starter checklist in `lib/plan.ts`.
