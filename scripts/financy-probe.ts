/**
 * Prints what Financy returns for this household, so the category map and
 * card-issuer rules can be finalized from real strings.
 *   npx tsx scripts/financy-probe.ts [days=90]
 */
import nextEnv from "@next/env"
nextEnv.loadEnvConfig(process.cwd())

import { addDays, todayIL } from "@/lib/money"

async function main() {
  const { fetchAll } = await import("@/lib/financy/client")
  const { balanceAmount, txAmount, txCategory, txDescription } = await import("@/lib/financy/types")
  type C = import("@/lib/financy/types").FinancyConnection
  type A = import("@/lib/financy/types").FinancyAccount
  type T = import("@/lib/financy/types").FinancyTransaction

  const days = Number(process.argv[2] ?? 90)
  const dateTo = todayIL()
  const dateFrom = addDays(dateTo, -days)

  const connections = await fetchAll<C>("/connections")
  console.log("\n== CONNECTIONS ==")
  for (const c of connections)
    console.log(`${c.providerId.padEnd(12)} ${c.status.padEnd(12)} expires=${c.expiryDate ?? "-"} lastFetched=${c.lastFetchedAt ?? "-"} id=${c.id}`)

  const accounts = await fetchAll<A>("/data/accounts")
  console.log("\n== ACCOUNTS ==")
  for (const a of accounts)
    console.log(
      `${a.accountType.padEnd(9)} ${a.providerId.padEnd(12)} ${(a.accountName ?? "").padEnd(24)} bal=${balanceAmount(a.balances?.[0]) ?? "-"} due=${a.cardDueDate ?? "-"} dup=${a.isDuplicate ?? false} id=${a.id}`,
    )
  const typeById = new Map(accounts.map((a) => [a.id, a.accountType]))

  const txs = await fetchAll<T>("/data/transactions", { dateFrom, dateTo, includeDuplicates: 0 })
  console.log(`\n== TRANSACTIONS ${dateFrom}..${dateTo}: ${txs.length} ==`)

  const cats = new Map<string, number>()
  for (const t of txs) {
    const c = txCategory(t)
    const k = `${c.main ?? "∅"} / ${c.sub ?? "∅"}`
    cats.set(k, (cats.get(k) ?? 0) + 1)
  }
  console.log("\n-- distinct (main / sub) with counts --")
  for (const [k, n] of [...cats.entries()].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), k)

  const checking = txs.filter((t) => typeById.get(t.accountId) !== "CARD")
  console.log("\n-- bank-side debits (largest 25) --")
  for (const t of checking.filter((t) => txAmount(t) < 0).sort((a, b) => txAmount(a) - txAmount(b)).slice(0, 25))
    console.log(`${t.date?.transactionDate} ${String(txAmount(t)).padStart(10)} ${t.providerId.padEnd(10)} m="${t.merchantName ?? ""}" d="${txDescription(t) ?? ""}" cat=${txCategory(t).main}/${txCategory(t).sub}`)

  console.log("\n-- bank-side credits (largest 15) --")
  for (const t of checking.filter((t) => txAmount(t) > 0).sort((a, b) => txAmount(b) - txAmount(a)).slice(0, 15))
    console.log(`${t.date?.transactionDate} ${String(txAmount(t)).padStart(10)} ${t.providerId.padEnd(10)} m="${t.merchantName ?? ""}" d="${txDescription(t) ?? ""}" cat=${txCategory(t).main}/${txCategory(t).sub}`)

  console.log("\n-- card sample (15) --")
  for (const t of txs.filter((t) => typeById.get(t.accountId) === "CARD").slice(0, 15))
    console.log(`${t.date?.transactionDate} ${String(txAmount(t)).padStart(10)} ${t.providerId.padEnd(10)} m="${t.merchantName ?? ""}" d="${txDescription(t) ?? ""}" cat=${txCategory(t).main}/${txCategory(t).sub} type=${t.type} inst=${t.installments?.number ?? "-"}/${t.installments?.total ?? "-"}`)

  console.log("\n-- raw first transaction --")
  console.log(JSON.stringify(txs[0], null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
