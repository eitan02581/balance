/**
 * Run the Financy → Postgres sync from the CLI.
 *   npm run sync            # last 45 days
 *   npm run sync -- --full  # last 12 months
 *   npm run sync -- --days 90
 *   npm run sync -- --reclassify   # re-run rules over all rows, no Financy call
 */
import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())

async function main() {
  const { runSync, reclassify } = await import("@/lib/financy/sync")
  const args = process.argv.slice(2)
  if (args.includes("--backfill-details")) {
    const { db } = await import("@/db")
    const { transactions } = await import("@/db/schema")
    const { txAmount, txDetails, txDescription } = await import("@/lib/financy/types")
    const { merchantKey } = await import("@/lib/classify/rules")
    const { eq } = await import("drizzle-orm")
    const rows = await db.select({ id: transactions.id, raw: transactions.raw, details: transactions.details, merchantKey: transactions.merchantKey, amount: transactions.amount }).from(transactions)
    let n = 0
    for (const r of rows) {
      const raw = r.raw as never
      const d = txDetails(raw)
      const k = merchantKey((raw as { merchantName?: string | null }).merchantName, txDescription(raw), d) || null
      const a = txAmount(raw)
      if (d !== r.details || k !== r.merchantKey || a !== r.amount) { await db.update(transactions).set({ details: d, merchantKey: k, amount: a }).where(eq(transactions.id, r.id)); n++ }
    }
    console.log(`details backfilled on ${n} rows`)
    return
  }
  if (args.includes("--reclassify")) {
    const n = await reclassify({ since: "1970-01-01" })
    console.log(`reclassified ${n} rows`)
    return
  }
  const full = args.includes("--full")
  const daysIdx = args.indexOf("--days")
  const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : 45
  const t0 = Date.now()
  const r = await runSync({ days, full })
  console.log(JSON.stringify(r, null, 2), `\n${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
