/**
 * Fill the DEMO database with a fake household (5 months of realistic Hebrew data), then run the real classifier.
 *   npm run seed:demo
 * Reads DEMO_DATABASE_URL and refuses to touch any database not named `balance_demo`. Re-running resets the sandbox.
 */
import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DEMO_DATABASE_URL) throw new Error("DEMO_DATABASE_URL is not set")
process.env.DATABASE_URL = process.env.DEMO_DATABASE_URL

import { sql } from "drizzle-orm"

import { merchantKey } from "@/lib/classify/rules"
import { addMonths, monthKey, todayIL } from "@/lib/money"

const DEMO_DB = "balance_demo"
const MONTHS_BACK = 4

// Deterministic PRNG so every reset produces the same world.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260923)
const between = (lo: number, hi: number) => Math.round((lo + rand() * (hi - lo)) * 100) / 100
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const count = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))

const CONNECTIONS = [
  { id: "demo-conn-hapoalim", providerId: "hapoalim" },
  { id: "demo-conn-cal", providerId: "cal" },
  { id: "demo-conn-max", providerId: "max" },
  { id: "demo-conn-isracard", providerId: "isracard" },
]
const CHECKING = { id: "demo-acc-checking", connectionId: "demo-conn-hapoalim", providerId: "hapoalim", accountType: "CHECKING", displayName: "עו״ש משותף", accountNumber: "12-345-678901", balance: 12430, role: "spending" }
const SAVINGS = { id: "demo-acc-savings", connectionId: "demo-conn-hapoalim", providerId: "hapoalim", accountType: "SAVINGS", displayName: "חיסכון", accountNumber: "12-345-990244", balance: 48200, role: "savings" }
const CARDS = [
  { id: "demo-card-cal", connectionId: "demo-conn-cal", providerId: "cal", accountType: "CARD", displayName: null, accountNumber: "458012xxxxxx4421", creditLimit: 15000, chargeName: "כאל", role: "spending" },
  { id: "demo-card-max", connectionId: "demo-conn-max", providerId: "max", accountType: "CARD", displayName: null, accountNumber: "5326xxxxxxxx7730", creditLimit: 12000, chargeName: "מקס איט פיננסים", role: "spending" },
  { id: "demo-card-isracard", connectionId: "demo-conn-isracard", providerId: "isracard", accountType: "CARD", displayName: null, accountNumber: "4580xxxxxxxx1187", creditLimit: 10000, chargeName: "ישראכרט", role: "spending" },
]

// [merchants, how many per month, amount range, financy main, financy sub]
type CardKind = { names: string[]; n: [number, number]; amount: [number, number]; main: string; sub: string | null }
const CARD_KINDS: CardKind[] = [
  { names: ["שופרסל דיל", "רמי לוי", "ויקטורי", "AM:PM"], n: [8, 11], amount: [90, 420], main: "FOOD", sub: "GROCERIES" },
  { names: ["WOLT וולט", "קפה גרג", "ג'פניקה", "פיצה עגבניה", "ארומה", "הבורגר של משה"], n: [6, 9], amount: [40, 260], main: "FOOD", sub: "RESTAURANT" },
  { names: ["פז", "סונול", "דלק מנטה"], n: [2, 3], amount: [180, 340], main: "TRANSPORT", sub: "FUEL" },
  { names: ["פנגו"], n: [1, 3], amount: [12, 45], main: "TRANSPORT", sub: "PARKING" },
  { names: ["סופר-פארם"], n: [1, 3], amount: [60, 220], main: "HEALTH", sub: "PHARMACY" },
  { names: ["זארה", "H&M", "פוקס"], n: [1, 2], amount: [120, 390], main: "SHOPPING", sub: "CLOTHING" },
  { names: ["סינמה סיטי", "יס פלנט", "לונה פארק"], n: [1, 2], amount: [80, 260], main: "LEISURE", sub: "LEISURE_OTHER" },
  { names: ["פטקס"], n: [1, 1], amount: [90, 260], main: "OTHER", sub: "PETS" },
  { names: ["איקאה", "עלי אקספרס", "KSP"], n: [1, 2], amount: [60, 450], main: "SHOPPING", sub: "SHOPPING_OTHER" },
]
// Same amount every month, like real subscriptions and insurance.
const CARD_FIXED = [
  { name: "NETFLIX.COM", amount: 54.9, main: "OTHER", sub: null },
  { name: "SPOTIFY", amount: 24.9, main: "OTHER", sub: null },
  { name: "ANTHROPIC* CLAUDE SUB", amount: 304.72, main: "SHOPPING", sub: "ELECTRONICS" },
  { name: "יס YES", amount: 199, main: "HOME", sub: "COMMUNICATIONS" },
  { name: "הראל ביטוח", amount: 386, main: "INSURANCE", sub: "INSURANCE" },
]
const BANK_FIXED = [
  { name: "משכורת - טכנולוגיות בע״מ", amount: 14500, day: 9, main: "INCOME", sub: "SALARY" },
  { name: "משכורת - עיריית תל אביב", amount: 9800, day: 10, main: "INCOME", sub: "SALARY" },
  { name: "העברה - שכר דירה", amount: -5200, day: 1, main: "OTHER", sub: null },
  { name: "חברת החשמל", amount: -455, day: 14, main: "HOME", sub: "UTILITIES" },
  { name: "מי אביבים", amount: -162, day: 16, main: "HOME", sub: "UTILITIES" },
  { name: "עיריית תל אביב - ארנונה", amount: -620, day: 3, main: "HOME", sub: "GOVERNMENT_SERVICES" },
  { name: "פרטנר", amount: -89, day: 20, main: "HOME", sub: "COMMUNICATIONS" },
  { name: "הוראת קבע - קרן השתלמות", amount: -1500, day: 11, main: "SAVINGS", sub: "SECURITIES" },
]
const BIT_PAYEES = ["דנה לוי", "יוסי כהן", "גן הילדים", "מאמן כדורגל"]

type Row = {
  id: string
  accountId: string
  providerId: string
  accountType: string
  txType: string
  merchantName: string
  description: string
  details: string | null
  merchantKey: string | null
  amount: number
  currency: string
  transactionDate: string
  bookingDate: string
  month: string
  financyMain: string
  financySub: string | null
  isDuplicate: boolean
  raw: unknown
}

function buildTransactions(months: string[], today: string) {
  const rows: Row[] = []
  let n = 0
  const add = (acc: { id: string; providerId: string; accountType: string }, month: string, day: number, name: string, amount: number, main: string, sub: string | null, details: string | null = null) => {
    const date = `${month}-${String(day).padStart(2, "0")}`
    if (date > today) return
    rows.push({
      id: `demo-tx-${String(++n).padStart(5, "0")}`,
      accountId: acc.id,
      providerId: acc.providerId,
      accountType: acc.accountType,
      txType: acc.accountType === "CARD" ? "CARD" : "CHECKING",
      merchantName: name,
      description: name,
      details,
      merchantKey: merchantKey(name, name, details) || null,
      amount,
      currency: "ILS",
      transactionDate: date,
      bookingDate: date,
      month,
      financyMain: main,
      financySub: sub,
      isDuplicate: false,
      raw: { demo: true, status: "BOOKED" },
    })
  }

  const cardSpend = new Map<string, number>() // `${cardId}|${month}` → charged next month
  for (const month of months) {
    for (const card of CARDS) {
      let spent = 0
      for (const k of CARD_KINDS) {
        const times = count(k.n[0], k.n[1])
        for (let i = 0; i < times; i++) {
          if (rand() < 1 / CARDS.length) {
            const a = between(k.amount[0], k.amount[1])
            add(card, month, count(1, 28), pick(k.names), -a, k.main, k.sub)
            spent += a
          }
        }
      }
      cardSpend.set(`${card.id}|${month}`, spent)
    }
    // subscriptions/insurance all sit on the first card
    for (const f of CARD_FIXED) {
      add(CARDS[0], month, 21, f.name, -f.amount, f.main, f.sub)
      cardSpend.set(`${CARDS[0].id}|${month}`, (cardSpend.get(`${CARDS[0].id}|${month}`) ?? 0) + f.amount)
    }
    for (const f of BANK_FIXED) add(CHECKING, month, f.day, f.name, f.amount, f.main, f.sub)
    add(SAVINGS, month, 11, "הפקדה לקרן השתלמות", 1500, "SAVINGS", "SECURITIES")
    for (let i = 0; i < count(1, 3); i++) add(CHECKING, month, count(2, 27), "העברה בביט", -between(80, 400), "OTHER", "BIT_PAYBOX", `אל: ${pick(BIT_PAYEES)}`)
    // last month's card spend is charged on the 10th
    const prev = addMonths(month, -1)
    for (const card of CARDS) {
      const charged = cardSpend.get(`${card.id}|${prev}`) ?? between(3000, 6000)
      add(CHECKING, month, 10, card.chargeName, -Math.round(charged * 100) / 100, "TRANSFER", "CREDIT_CARD_CHECKING")
    }
  }
  return rows
}

async function main() {
  const { db } = await import("@/db")
  const { accounts, actionProgress, categories, connections, goalAllocations, goals, insightDismissals, merchantRules, monthCloses, monthlyPlans, rewardEvents, rewardSettings, syncRuns, transactions } = await import("@/db/schema")
  const { reclassify } = await import("@/lib/financy/sync")

  const [{ db: dbName }] = (await db.execute(sql`select current_database() as db`)).rows as { db: string }[]
  if (dbName !== DEMO_DB) throw new Error(`Refusing to seed "${dbName}": DEMO_DATABASE_URL must point at ${DEMO_DB}`)

  const today = todayIL()
  const current = monthKey(today)
  const months = Array.from({ length: MONTHS_BACK + 1 }, (_, i) => addMonths(current, i - MONTHS_BACK))

  // Reset everything except the category list (db/seed.ts owns that).
  for (const t of [goalAllocations, monthCloses, monthlyPlans, goals, transactions, merchantRules, accounts, connections, syncRuns, rewardEvents, rewardSettings, insightDismissals, actionProgress]) await db.delete(t)

  const now = new Date()
  const expiry = new Date(now.getTime() + 150 * 86_400_000)
  await db.insert(connections).values(CONNECTIONS.map((c) => ({ ...c, status: "ACTIVE", expiryDate: expiry, lastFetchedAt: now, raw: { demo: true } })))
  await db.insert(accounts).values(
    [CHECKING, SAVINGS, ...CARDS].map(({ chargeName: _c, ...a }: (typeof CARDS)[number] | typeof CHECKING & { chargeName?: string }) => ({
      ...a,
      currency: "ILS",
      cardDueDate: "creditLimit" in a ? "10" : null,
      raw: { demo: true },
    })),
  )

  const rows = buildTransactions(months, today)
  for (let i = 0; i < rows.length; i += 200) await db.insert(transactions).values(rows.slice(i, i + 200))

  const cats = Object.fromEntries((await db.select({ id: categories.id, slug: categories.slug }).from(categories)).map((c) => [c.slug, c.id]))
  await db.insert(merchantRules).values({ merchantKey: merchantKey("העברה - שכר דירה", "העברה - שכר דירה", null), categoryId: cats.home })

  const [vacation] = await db.insert(goals).values([{ name: "חופשה", emoji: "✈️", targetAmount: 25000, currentAmount: 6500 }, { name: "ספה חדשה", emoji: "🛋️", targetAmount: 6000, currentAmount: 1200 }]).returning()
  await db.insert(monthlyPlans).values(months.map((month) => ({ month, spendingTarget: 16000, savingsTarget: 4000, defaultGoalId: vacation.id })))
  await db.insert(syncRuns).values({ startedAt: now, finishedAt: now, status: "ok", txUpserted: rows.length })
  const checkinDays = [3, 5, 8, 12, 15, 19].map((d) => `${current}-${String(d).padStart(2, "0")}`).filter((d) => d <= today)
  if (checkinDays.length) await db.insert(rewardEvents).values(checkinDays.map((date) => ({ kind: "checkin", date, amount: 50 })))

  const reclassified = await reclassify({ since: "1970-01-01" })
  const summary = (await db.execute(sql`select coalesce(c.slug, coalesce(t.exclusion_reason, 'review')) as bucket, count(*)::int as n from transactions t left join categories c on c.id = t.balance_category_id group by 1 order by 2 desc`)).rows
  console.log(`seeded ${DEMO_DB}: ${rows.length} transactions over ${months[0]}…${current}, ${reclassified} classified`)
  console.log(summary.map((r) => `${(r as { bucket: string }).bucket}=${(r as { n: number }).n}`).join("  "))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
