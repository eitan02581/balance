/** Verification report: per-month spend, exclusions, review queue, card charges vs card purchases.  npx tsx scripts/report.ts [YYYY-MM] */
import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())
import { sql } from "drizzle-orm"

async function main() {
  const { db } = await import("@/db")
  const month = process.argv[2]
  const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)).rows
  console.log("== months (spending only) ==")
  console.table(await q(sql`select month, round(sum(-amount))::int as spent, count(*)::int as n from transactions where not is_excluded and account_type <> 'SAVINGS' and not is_duplicate group by month order by month desc limit 13`))
  console.log("== exclusions by reason ==")
  console.table(await q(sql`select exclusion_reason, count(*)::int as n, round(sum(-amount))::int as debits from transactions where is_excluded and not is_duplicate group by 1 order by 2 desc`))
  console.log("== needs review ==")
  console.table(await q(sql`select count(*)::int as n, round(sum(-amount))::int as amount from transactions where needs_review and not is_excluded and not is_duplicate`))
  console.table(await q(sql`select coalesce(merchant_name, description) as who, count(*)::int as n, round(sum(-amount))::int as amount from transactions where needs_review and not is_excluded and not is_duplicate group by 1 order by 2 desc limit 15`))
  console.log("== category source ==")
  console.table(await q(sql`select category_source, count(*)::int as n from transactions where not is_duplicate group by 1`))
  if (month) {
    console.log(`== ${month} by category ==`)
    console.table(await q(sql`select c.emoji||' '||c.name_he as category, round(sum(-t.amount))::int as spent, count(*)::int as n from transactions t left join categories c on c.id=t.balance_category_id where t.month=${month} and not t.is_excluded and not t.is_duplicate group by 1 order by 2 desc`))
    console.log(`== ${month} card charges on bank vs card purchases ==`)
    console.table(await q(sql`select provider_id, round(sum(-amount))::int as charged from transactions where month=${month} and exclusion_reason='card_charge' group by 1`))
    console.table(await q(sql`select provider_id, round(sum(-amount))::int as purchases, count(*)::int as n from transactions where month=${month} and account_type='CARD' and not is_duplicate group by 1`))
  }
  console.log("== accounts ==")
  console.table(await q(sql`select account_type, provider_id, role, balance, (select count(*) from transactions t where t.account_id=a.id)::int as tx from accounts a order by 1,2`))
}
main().catch((e) => { console.error(e); process.exit(1) })
