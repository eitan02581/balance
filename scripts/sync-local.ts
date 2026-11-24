/**
 * Run the Financy → Postgres sync from the CLI.
 *   npm run sync            # last 45 days
 *   npm run sync -- --full  # last 12 months
 *   npm run sync -- --days 90
 *   npm run sync -- --reclassify   # re-run rules over all rows, no Financy call
 *   npm run sync -- --fix-amounts  # recompute every stored amount from its raw Financy row (foreign currency → ILS), then reclassify
 */
import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())

async function main() {
  const { runSync, reclassify } = await import("@/lib/financy/sync")
  const args = process.argv.slice(2)
  if (args.includes("--backfill-details") || args.includes("--fix-amounts")) {
    const { db } = await import("@/db")
    const { transactions } = await import("@/db/schema")
    const { needsFx, txAmountInfo, txDetails, txDescription } = await import("@/lib/financy/types")
    const { fetchBoiRates, FALLBACK_ILS_RATES } = await import("@/lib/fx")
    const { merchantKey } = await import("@/lib/classify/rules")
    const { eq } = await import("drizzle-orm")
    const rows = await db.select({ id: transactions.id, raw: transactions.raw, details: transactions.details, merchantKey: transactions.merchantKey, amount: transactions.amount, currency: transactions.currency }).from(transactions)
    const hasAmount = (raw: unknown) => !!(raw as { amount?: unknown } | null)?.amount // demo/seed rows carry no Financy amount
    const rates = rows.some((r) => hasAmount(r.raw) && needsFx(r.raw as never)) ? await fetchBoiRates() : FALLBACK_ILS_RATES
    let n = 0
    let fx = 0
    for (const r of rows) {
      if (!hasAmount(r.raw)) continue
      const raw = r.raw as never
      const d = txDetails(raw)
      const k = merchantKey((raw as { merchantName?: string | null }).merchantName, txDescription(raw), d) || null
      const m = txAmountInfo(raw, rates)
      if (m.converted && m.amount !== r.amount) fx++
      if (d !== r.details || k !== r.merchantKey || m.amount !== r.amount || m.sourceCurrency !== r.currency) {
        await db.update(transactions).set({ details: d, merchantKey: k, amount: m.amount, currency: m.sourceCurrency }).where(eq(transactions.id, r.id))
        n++
      }
    }
    console.log(`updated ${n} rows (${fx} foreign-currency amounts converted to ILS)`)
    console.log(`reclassified ${await reclassify({ since: "1970-01-01" })} rows`)
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
