import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())

import { eq } from "drizzle-orm"

import { monthKey } from "@/lib/money"

async function main() {
  const { db } = await import("./index")
  const { categories, goals, monthlyPlans } = await import("./schema")

  const seedCategories = [
    { slug: "eating-out", nameHe: "אוכל בחוץ", emoji: "🍽️", kind: "expense", monthlyTarget: 2500, sortOrder: 10 },
    { slug: "groceries", nameHe: "סופר וקניות לבית", emoji: "🛒", kind: "expense", monthlyTarget: 2200, sortOrder: 20 },
    { slug: "car", nameHe: "רכב ותחבורה", emoji: "🚗", kind: "expense", monthlyTarget: 1500, sortOrder: 30 },
    { slug: "home", nameHe: "בית וחשבונות", emoji: "🏠", kind: "expense", monthlyTarget: null, sortOrder: 40 },
    { slug: "shopping", nameHe: "קניות", emoji: "🛍️", kind: "expense", monthlyTarget: 1200, sortOrder: 50 },
    { slug: "clothing", nameHe: "ביגוד והנעלה", emoji: "👟", kind: "expense", monthlyTarget: null, sortOrder: 55 },
    { slug: "health", nameHe: "בריאות וטיפוח", emoji: "💊", kind: "expense", monthlyTarget: null, sortOrder: 60 },
    { slug: "leisure", nameHe: "פנאי ובילויים", emoji: "🎉", kind: "expense", monthlyTarget: 1200, sortOrder: 70 },
    { slug: "subscriptions", nameHe: "מנויים ודיגיטל", emoji: "💻", kind: "expense", monthlyTarget: null, sortOrder: 75 },
    { slug: "pets", nameHe: "חיות מחמד", emoji: "🐾", kind: "expense", monthlyTarget: null, sortOrder: 78 },
    { slug: "fees", nameHe: "עמלות", emoji: "🧾", kind: "expense", monthlyTarget: null, sortOrder: 80 },
    { slug: "insurance", nameHe: "ביטוח", emoji: "🛡️", kind: "expense", monthlyTarget: null, sortOrder: 82 },
    { slug: "loans", nameHe: "הלוואות", emoji: "🏦", kind: "expense", monthlyTarget: null, sortOrder: 85 },
    { slug: "other", nameHe: "אחר", emoji: "📦", kind: "expense", monthlyTarget: null, sortOrder: 90 },
    { slug: "income-national-insurance", nameHe: "ביטוח לאומי", emoji: "🏛️", kind: "income", monthlyTarget: null, sortOrder: 100 },
    { slug: "income-salary", nameHe: "משכורת", emoji: "💼", kind: "income", monthlyTarget: null, sortOrder: 101 },
    { slug: "income-family", nameHe: "משפחה", emoji: "👨‍👩‍👧", kind: "income", monthlyTarget: null, sortOrder: 102 },
    { slug: "income-refunds", nameHe: "החזרים", emoji: "↩️", kind: "income", monthlyTarget: null, sortOrder: 103 },
    { slug: "income", nameHe: "הכנסה אחרת", emoji: "💰", kind: "income", monthlyTarget: null, sortOrder: 109 },
    { slug: "savings", nameHe: "חיסכון והשקעות", emoji: "📈", kind: "savings", monthlyTarget: null, sortOrder: 110 },
    { slug: "transfer", nameHe: "העברה פנימית", emoji: "🔄", kind: "transfer", monthlyTarget: null, sortOrder: 120 },
    { slug: "card-charge", nameHe: "חיוב כרטיס אשראי", emoji: "💳", kind: "transfer", monthlyTarget: null, sortOrder: 130 },
  ]

  for (const c of seedCategories) {
    // names/emoji/order follow the seed; monthlyTarget is the user's and is only set on first insert
    await db
      .insert(categories)
      .values(c)
      .onConflictDoUpdate({ target: categories.slug, set: { nameHe: c.nameHe, emoji: c.emoji, kind: c.kind, sortOrder: c.sortOrder } })
  }

  let [goal] = await db.select().from(goals).where(eq(goals.name, "חופשה"))
  if (!goal) {
    ;[goal] = await db
      .insert(goals)
      .values({ name: "חופשה", emoji: "✈️", targetAmount: 20000, currentAmount: 0 })
      .returning()
  }

  const month = monthKey(new Date())
  await db
    .insert(monthlyPlans)
    .values({ month, spendingTarget: 15000, savingsTarget: 5000, defaultGoalId: goal.id })
    .onConflictDoNothing({ target: monthlyPlans.month })

  console.log(`seeded: ${seedCategories.length} categories, goal "${goal.emoji} ${goal.name}", plan for ${month}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
