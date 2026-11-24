import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm"

import { db } from "@/db"
import { accounts, categories, connections, merchantRules, syncRuns, transactions } from "@/db/schema"
import { classifyAll, type Classification } from "@/lib/classify/classify"
import { isDemo } from "@/lib/demo"
import { merchantKey } from "@/lib/classify/rules"
import { addDays, monthKey, todayIL } from "@/lib/money"
import { fetchAll } from "./client"
import { fetchBoiRates, FALLBACK_ILS_RATES } from "@/lib/fx"
import { balanceAmount, needsFx, num, txAmountInfo, txCategory, txDate, txDescription, txDetails, withoutSupersededPending, type FinancyAccount, type FinancyConnection, type FinancyTransaction } from "./types"

export type SyncResult = { runId: number; connections: number; accounts: number; txUpserted: number; reclassified: number; dateFrom: string; dateTo: string }

const CHUNK_DAYS = 90
const BATCH = 200

function chunks<T>(arr: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Pull connections, accounts and transactions from Financy into Postgres, then (re)classify. Idempotent. */
export async function runSync({ days = 45, full = false }: { days?: number; full?: boolean } = {}): Promise<SyncResult> {
  if (isDemo()) return { runId: 0, connections: 0, accounts: 0, txUpserted: 0, reclassified: 0, dateFrom: "", dateTo: "" }
  const [run] = await db.insert(syncRuns).values({}).returning({ id: syncRuns.id })
  try {
    const dateTo = todayIL()
    const dateFrom = addDays(dateTo, -(full ? 365 : days))

    // 1. Connections
    const conns = await fetchAll<FinancyConnection>("/connections")
    for (const c of conns) {
      await db
        .insert(connections)
        .values({
          id: c.id,
          providerId: c.providerId,
          status: c.status,
          expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
          lastFetchedAt: c.lastFetchedAt ? new Date(c.lastFetchedAt) : null,
          raw: c,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: connections.id,
          set: { providerId: c.providerId, status: c.status, expiryDate: c.expiryDate ? new Date(c.expiryDate) : null, lastFetchedAt: c.lastFetchedAt ? new Date(c.lastFetchedAt) : null, raw: c, syncedAt: new Date() },
        })
    }

    // 2. Accounts (never overwrite displayName / role)
    const accs = await fetchAll<FinancyAccount>("/data/accounts")
    for (const a of accs) {
      const values = {
        id: a.id,
        connectionId: a.connectionId ?? null,
        providerId: a.providerId,
        accountType: a.accountType,
        accountName: a.accountName ?? null,
        currency: a.currency ?? null,
        balance: balanceAmount(a.balances?.[0]),
        creditLimit: num(typeof a.creditLimit === "object" && a.creditLimit ? a.creditLimit.amount : a.creditLimit),
        cardDueDate: a.cardDueDate ?? null,
        accountNumber: a.accountNumber ?? null,
        isDuplicate: a.isDuplicate ?? false,
        raw: a,
        updatedAt: new Date(),
      }
      // role is set only on first sight; the user can change it later and we never overwrite it.
      const role = a.accountType === "SECURITIES" || a.accountType === "SAVINGS" ? "savings" : a.accountType === "LOAN" ? "ignore" : "spending"
      await db.insert(accounts).values({ ...values, role }).onConflictDoUpdate({ target: accounts.id, set: values })
    }
    const accountTypeById = new Map(accs.map((a) => [a.id, a.accountType]))

    // 3. Transactions, fetched in date chunks
    const items: FinancyTransaction[] = []
    for (let from = dateFrom; from <= dateTo; from = addDays(from, CHUNK_DAYS)) {
      const to = addDays(from, CHUNK_DAYS - 1) < dateTo ? addDays(from, CHUNK_DAYS - 1) : dateTo
      items.push(...(await fetchAll<FinancyTransaction>("/data/transactions", { dateFrom: from, dateTo: to, includeDuplicates: 0 })))
    }
    const kept = withoutSupersededPending(items).filter((t) => t.id && t.accountId && txDate(t))
    // Purchases abroad not yet billed in ILS (e.g. JPY) are converted at today's Bank of Israel rate.
    const rates = kept.some(needsFx) ? await fetchBoiRates() : FALLBACK_ILS_RATES
    const rows = kept.map((t) => {
        const cat = txCategory(t)
        const date = txDate(t)!
        const money = txAmountInfo(t, rates)
        return {
          id: t.id,
          accountId: t.accountId,
          providerId: t.providerId,
          accountType: accountTypeById.get(t.accountId) ?? "CHECKING",
          txType: t.type ?? null,
          merchantName: t.merchantName ?? null,
          description: txDescription(t),
          details: txDetails(t),
          merchantKey: merchantKey(t.merchantName, txDescription(t), txDetails(t)) || null,
          amount: money.amount, // always ILS
          currency: money.sourceCurrency, // "ILS", or the foreign currency the amount was converted from (an estimate)
          transactionDate: date,
          bookingDate: t.date?.bookingDate?.slice(0, 10) ?? null,
          month: monthKey(date),
          financyMain: cat.main,
          financySub: cat.sub,
          installmentNumber: num(t.installments?.number),
          installmentTotal: num(t.installments?.total),
          isDuplicate: t.isDuplicate ?? false,
          raw: t,
          syncedAt: new Date(),
        }
      })
    let txUpserted = 0
    for (const batch of chunks(rows, BATCH)) {
      await db
        .insert(transactions)
        .values(batch)
        .onConflictDoUpdate({
          target: transactions.id,
          set: {
            accountType: sql`excluded.account_type`,
            txType: sql`excluded.tx_type`,
            merchantName: sql`excluded.merchant_name`,
            description: sql`excluded.description`,
            details: sql`excluded.details`,
            merchantKey: sql`excluded.merchant_key`,
            amount: sql`excluded.amount`,
            currency: sql`excluded.currency`,
            transactionDate: sql`excluded.transaction_date`,
            bookingDate: sql`excluded.booking_date`,
            month: sql`excluded.month`,
            financyMain: sql`excluded.financy_main`,
            financySub: sql`excluded.financy_sub`,
            installmentNumber: sql`excluded.installment_number`,
            installmentTotal: sql`excluded.installment_total`,
            isDuplicate: sql`excluded.is_duplicate`,
            raw: sql`excluded.raw`,
            syncedAt: sql`excluded.synced_at`,
          },
        })
      txUpserted += batch.length
    }
    // A pending hold Financy no longer returns (it booked under a new id, or was released) must not linger as a second row.
    const keptIds = rows.map((r) => r.id)
    await db
      .delete(transactions)
      .where(and(sql`${transactions.raw}->>'status' = 'PENDING'`, gte(transactions.transactionDate, dateFrom), keptIds.length ? notInArray(transactions.id, keptIds) : undefined))

    // 4. Classification over the window
    const reclassified = await reclassify({ since: dateFrom })

    await db.update(syncRuns).set({ finishedAt: new Date(), status: "ok", txUpserted }).where(eq(syncRuns.id, run.id))
    return { runId: run.id, connections: conns.length, accounts: accs.length, txUpserted, reclassified, dateFrom, dateTo }
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), status: "error", error: e instanceof Error ? e.message : String(e) })
      .where(eq(syncRuns.id, run.id))
    throw e
  }
}

/** Re-run the classifier over unlocked rows since `since` (YYYY-MM-DD) and persist what changed. */
export async function reclassify({ since, onlyIds }: { since: string; onlyIds?: string[] } = { since: "1970-01-01" }) {
  const where = onlyIds ? inArray(transactions.id, onlyIds) : gte(transactions.transactionDate, since)
  const [rows, accountList, rules, cats] = await Promise.all([
    db.select().from(transactions).where(where),
    db.select({ id: accounts.id, accountType: accounts.accountType, role: accounts.role }).from(accounts),
    db.select().from(merchantRules),
    db.select({ id: categories.id, slug: categories.slug }).from(categories),
  ])
  const categoryIds = Object.fromEntries(cats.map((c) => [c.slug, c.id]))
  const result = classifyAll(rows, accountList, rules, categoryIds)

  let changed = 0
  for (const row of rows) {
    const c = result.get(row.id)
    if (!c || same(row, c)) continue
    await db.update(transactions).set(c).where(and(eq(transactions.id, row.id), eq(transactions.manualLock, false)))
    changed++
  }
  return changed
}

function same(row: typeof transactions.$inferSelect, c: Classification) {
  return (
    row.balanceCategoryId === c.balanceCategoryId &&
    row.categorySource === c.categorySource &&
    row.isExcluded === c.isExcluded &&
    row.exclusionReason === c.exclusionReason &&
    row.needsReview === c.needsReview
  )
}

/** Sync on visit when the last successful sync is older than `hours`. Never throws. */
export async function syncIfStale(hours = 3) {
  try {
    const [last] = await db.select({ finishedAt: syncRuns.finishedAt }).from(syncRuns).where(eq(syncRuns.status, "ok")).orderBy(desc(syncRuns.finishedAt)).limit(1)
    const [running] = await db.select({ startedAt: syncRuns.startedAt }).from(syncRuns).where(eq(syncRuns.status, "running")).orderBy(desc(syncRuns.startedAt)).limit(1)
    if (running && Date.now() - running.startedAt.getTime() < 5 * 60_000) return
    if (last?.finishedAt && Date.now() - last.finishedAt.getTime() < hours * 3_600_000) return
    await runSync()
  } catch (e) {
    console.error("syncIfStale failed", e)
  }
}
