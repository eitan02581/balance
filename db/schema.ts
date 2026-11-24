import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" })
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })

/** Financy connections (one per bank/card issuer consent). */
export const connections = pgTable("connections", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  status: text("status").notNull(),
  expiryDate: ts("expiry_date"),
  lastFetchedAt: ts("last_fetched_at"),
  raw: jsonb("raw"),
  syncedAt: ts("synced_at").notNull().defaultNow(),
})

/** Bank (CHECKING/SAVINGS) and card (CARD) accounts as Financy reports them. */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id"),
  providerId: text("provider_id").notNull(),
  accountType: text("account_type").notNull(), // CHECKING | CARD | SAVINGS | LOAN | SECURITY
  accountName: text("account_name"),
  displayName: text("display_name"), // ours, editable
  currency: text("currency"),
  balance: money("balance"),
  creditLimit: money("credit_limit"),
  cardDueDate: text("card_due_date"),
  accountNumber: text("account_number"),
  role: text("role").notNull().default("spending"), // spending | savings | ignore
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  raw: jsonb("raw"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
})

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  emoji: text("emoji").notNull(),
  kind: text("kind").notNull().default("expense"), // expense | income | savings | transfer
  monthlyTarget: money("monthly_target"),
  sortOrder: integer("sort_order").notNull().default(0),
})

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accountType: text("account_type").notNull(),
    txType: text("tx_type"), // NORMAL | INSTALLMENT
    merchantName: text("merchant_name"),
    description: text("description"),
    details: text("details"), // payee / purpose / counterparty extracted from Financy raw
    merchantKey: text("merchant_key"), // normalised merchant (+ counterparty for Bit/transfers); a category change propagates by this key
    note: text("note"), // user's free-text note (e.g. "ההורים משלמים")
    amount: money("amount").notNull(), // signed, negative = debit
    currency: text("currency"), // "ILS", or the foreign currency `amount` was converted from (estimate until billed in ILS)
    transactionDate: text("transaction_date").notNull(), // YYYY-MM-DD
    bookingDate: text("booking_date"),
    month: text("month").notNull(), // YYYY-MM
    financyMain: text("financy_main"),
    financySub: text("financy_sub"),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    // Balance's own classification
    balanceCategoryId: integer("balance_category_id").references(() => categories.id),
    categorySource: text("category_source"), // mapping | merchant_rule | manual
    isExcluded: boolean("is_excluded").notNull().default(false),
    exclusionReason: text("exclusion_reason"), // card_charge | internal_transfer | savings | income | manual
    needsReview: boolean("needs_review").notNull().default(false),
    manualLock: boolean("manual_lock").notNull().default(false),
    raw: jsonb("raw"),
    syncedAt: ts("synced_at").notNull().defaultNow(),
  },
  (t) => [
    index("tx_month_idx").on(t.month),
    index("tx_account_date_idx").on(t.accountId, t.transactionDate),
    index("tx_needs_review_idx").on(t.needsReview),
    index("tx_merchant_idx").on(t.merchantName),
    index("tx_merchant_key_idx").on(t.merchantKey),
  ],
)

/** Remembered corrections: merchant → category (or exclusion). */
export const merchantRules = pgTable("merchant_rules", {
  id: serial("id").primaryKey(),
  merchantKey: text("merchant_key").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id),
  isExcluded: boolean("is_excluded").notNull().default(false),
  exclusionReason: text("exclusion_reason"),
  createdAt: ts("created_at").notNull().defaultNow(),
})

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  targetAmount: money("target_amount").notNull(),
  currentAmount: money("current_amount").notNull().default(0),
  createdAt: ts("created_at").notNull().defaultNow(),
  archivedAt: ts("archived_at"),
})

export const monthlyPlans = pgTable("monthly_plans", {
  month: text("month").primaryKey(), // YYYY-MM
  spendingTarget: money("spending_target").notNull(),
  spendingFromCategories: boolean("spending_from_categories").notNull().default(false), // true → target = Σ category targets
  savingsTarget: money("savings_target").notNull(),
  defaultGoalId: integer("default_goal_id").references(() => goals.id),
  updatedAt: ts("updated_at").notNull().defaultNow(),
})

export const goalAllocations = pgTable("goal_allocations", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id),
  month: text("month").notNull(),
  amount: money("amount").notNull(),
  source: text("source").notNull().default("month_close"), // month_close | manual
  createdAt: ts("created_at").notNull().defaultNow(),
})

export const monthCloses = pgTable("month_closes", {
  month: text("month").primaryKey(),
  spendingTarget: money("spending_target").notNull(),
  savingsTarget: money("savings_target").notNull(),
  actualSpend: money("actual_spend").notNull(),
  surplus: money("surplus").notNull(),
  allocatedGoalId: integer("allocated_goal_id").references(() => goals.id),
  allocatedAmount: money("allocated_amount").notNull().default(0),
  closedAt: ts("closed_at").notNull().defaultNow(),
})

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: ts("started_at").notNull().defaultNow(),
  finishedAt: ts("finished_at"),
  status: text("status").notNull().default("running"), // running | ok | error
  txUpserted: integer("tx_upserted").notNull().default(0),
  error: text("error"),
})

export type Transaction = typeof transactions.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Category = typeof categories.$inferSelect
export type Goal = typeof goals.$inferSelect
export type MonthlyPlan = typeof monthlyPlans.$inferSelect
export type MonthClose = typeof monthCloses.$inferSelect

/** "Seen it, don't nag" — an insight comes back when it recurs after the dismissal. */
export const insightDismissals = pgTable("insight_dismissals", {
  key: text("key").primaryKey(),
  dismissedAt: ts("dismissed_at").notNull().defaultNow(),
})

/** Gym reward loop: a check-in earns fun money, a spend uses it. One row per event. */
export const rewardEvents = pgTable("reward_events", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // checkin | spend
  date: text("date").notNull(), // YYYY-MM-DD (Israel)
  amount: money("amount").notNull(), // +reward for checkin, −amount for spend
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
})

export const rewardSettings = pgTable("reward_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("הבונוס שלי"),
  rewardPerVisit: money("reward_per_visit").notNull().default(50),
  weeklyGoal: integer("weekly_goal").notNull().default(3),
})

export type RewardEvent = typeof rewardEvents.$inferSelect
export type RewardSettings = typeof rewardSettings.$inferSelect

/** Progress on the playbook's action items (the list itself lives in code: lib/plan.ts). */
export const actionProgress = pgTable("action_progress", {
  key: text("key").primaryKey(),
  done: boolean("done").notNull().default(false),
  doneAt: ts("done_at"),
  note: text("note"),
})
