# Balance

**A household finance tracker for two, in Hebrew.** It reads your Israeli bank and credit-card transactions through Open Finance, sorts them into categories, and shows one simple picture of the month: what came in, what went out, where it went, and how much is left to put toward a shared goal.

> מעקב הוצאות והכנסות למשק בית, בעברית. רואים לאן הכסף הולך, מוציאים פחות, וההפרש הולך ליעד משותף.

## What it costs

| Piece | What it's for | Price |
|---|---|---|
| [Neon](https://neon.tech) | Postgres database | Free tier |
| [Vercel](https://vercel.com) | Hosting + daily sync (optional; you can run it locally) | Free (Hobby) |
| Financy / Open Finance | Reads your bank and card data | **Paid**. Check their current pricing. Not needed for the demo |

## Setup: let Claude Code do it

You need [Node.js 20+](https://nodejs.org) and [Claude Code](https://claude.com/claude-code).

```bash
git clone <this repo's URL> balance
cd balance
claude
```

Then type **`/setup`**. Claude will ask whether you want:

- **Demo**: a fake household with 5 months of data. Free, no bank connection, about 5 minutes. Good for trying it out.
- **Real data**: your own banks and cards through Financy.

It creates the database, generates the secrets, runs the first sync, and (if you want) deploys to Vercel. You'll only be asked for things only you have: signing in to Neon/Vercel in the browser, a login password for the app, and your Financy API keys.

## Setup by hand

1. `npm install`
2. Create a free Neon project (https://console.neon.tech) and copy its **pooled** connection string.
3. `cp .env.example .env.local` and fill it in:
   - `DATABASE_URL`: the connection string
   - `SESSION_SECRET`, `CRON_SECRET`: `openssl rand -hex 32` each
   - `HOUSEHOLD_PASSWORD`: the password you'll both log in with (12+ characters)
   - `FINANCY_CLIENT_ID`, `FINANCY_CLIENT_SECRET`, `FINANCY_USER_ID`: from the Financy app (Settings → API)
4. Create the tables and defaults:
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. Check Financy access, pull 12 months, and run:
   ```bash
   npm run probe
   npm run sync -- --full
   npm run dev
   ```
6. Open http://localhost:3000.

**Demo instead of real data:** in Neon, create a second database named exactly `balance_demo`. Put its pooled connection string in both `DATABASE_URL` and `DEMO_DATABASE_URL`, set `DEMO_MODE=1`, leave the Financy keys empty, then run `npm run db:push && npm run db:seed && npm run seed:demo && npm run dev`. Demo mode skips the login.

## Deploy (Vercel Hobby, free)

```bash
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL production   # repeat for every variable in .env.local
npx vercel --prod
```

`vercel.json` schedules `/api/cron/sync` once a day (the Hobby limit). The app also syncs when you open it and the data is more than 3 hours old, and the refresh button syncs on demand. If the production URL asks for a Vercel login, turn off **Vercel Authentication** in Project Settings → Deployment Protection.

## Make it yours

- **/accounts**: name each bank account and card, and mark accounts that are savings or that the app should ignore.
- **/settings**: the monthly plan (spending ceiling + savings target) and a ceiling per category.
- **/goals**: what you're saving for. At month close, money you didn't spend is added to a goal.
- **`lib/plan.ts`**: the "צעדים" checklist is a generic starter list for Israeli households. Edit it to fit yours.
- **/gym ("בונוסים")**: an optional reward jar: every workout adds a small amount you can spend guilt-free.
- Wrong category? Fix it once with "remember this merchant" and it applies to every future transaction from that merchant.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally |
| `npm run sync` | Pull the last 45 days (`-- --full` for 12 months, `-- --days 90`) |
| `npm run sync -- --reclassify` | Re-run the category rules over stored rows (no Financy call) |
| `npm run probe` | Print Financy connections, accounts and sample rows |
| `npm run seed:demo` | Reset the demo database with fake data |
| `npm test` · `npm run typecheck` | Unit tests · type check |
| `npm run db:push` | Apply the schema to Neon |

## How the numbers are counted

- Card purchases are the expenses. The monthly card bill on the bank account is not counted again.
- Transfers between your own accounts (same amount, opposite sign, within 3 days) are not counted.
- Money sent to savings/investments is shown separately, not as spending.
- Card refunds reduce spending in their category.
- Unknown bank debits wait in a review queue until you categorize them.

## Security and privacy

- Your financial data lives only in **your** Neon database. Nobody else's deployment can see it, and yours can't see theirs.
- One shared password protects the app. It must be **at least 12 characters** (the app refuses to start with less), and wrong guesses are slowed down. Use a few random words.
- Every server action checks the session itself, and the cron endpoint needs `CRON_SECRET`.
- Demo mode (no login) only switches on when the database is named `balance_demo`, so leaving `DEMO_MODE=1` on by mistake can't expose real data. Demo sessions aren't accepted by real deployments.
- Use separate `SESSION_SECRET` / `CRON_SECRET` values for every deployment. Rotating `SESSION_SECRET` logs everyone out.
- `.env.local` is gitignored: never commit it.
