import { describe, expect, it } from "vitest"

import { classifyAll, type AccountLike, type TxLike } from "@/lib/classify/classify"
import { merchantKey } from "@/lib/classify/rules"

const ids = { "eating-out": 1, groceries: 2, car: 3, fees: 4, loans: 5, subscriptions: 6, insurance: 7, income: 10, "income-national-insurance": 14, "income-salary": 15, savings: 11, transfer: 12, "card-charge": 13 }
const accounts: AccountLike[] = [
  { id: "hapoalim", accountType: "CHECKING", role: "spending" },
  { id: "leumi", accountType: "CHECKING", role: "spending" },
  { id: "max", accountType: "CARD", role: "spending" },
]
const tx = (p: Partial<TxLike> & { id: string }): TxLike => ({
  accountId: "max",
  accountType: "CARD",
  amount: -100,
  transactionDate: "2026-09-10",
  merchantName: null,
  description: null,
  financyMain: null,
  financySub: null,
  manualLock: false,
  ...p,
})

describe("classifyAll", () => {
  it("files bank credits into an income bucket by payer", () => {
    const r = classifyAll(
      [
        tx({ id: "bl", accountId: "hapoalim", accountType: "CHECKING", amount: 3000, description: "בטוח לאומי חד", details: "ישראלי ישראל מזהה 1" }),
        tx({ id: "sal", accountId: "hapoalim", accountType: "CHECKING", amount: 9000, description: "משכורת" }),
        tx({ id: "family", accountId: "hapoalim", accountType: "CHECKING", amount: 2500, description: "העברה-נייד", details: "מאת: דנה" }),
      ],
      accounts,
      [],
      ids,
    )
    expect(r.get("bl")).toMatchObject({ isExcluded: true, exclusionReason: "income", balanceCategoryId: 14 })
    expect(r.get("sal")).toMatchObject({ isExcluded: true, exclusionReason: "income", balanceCategoryId: 15 })
    expect(r.get("family")).toMatchObject({ isExcluded: true, exclusionReason: "income", balanceCategoryId: 10 })
  })

  it("falls back to the generic income bucket when the specific one is not seeded", () => {
    const r = classifyAll([tx({ id: "bl", accountId: "hapoalim", accountType: "CHECKING", amount: 3000, description: "בטוח לאומי חד" })], accounts, [], { ...ids, "income-national-insurance": undefined as unknown as number })
    expect(r.get("bl")).toMatchObject({ isExcluded: true, exclusionReason: "income", balanceCategoryId: 10 })
  })

  it("excludes the monthly card charge on the checking account", () => {
    const r = classifyAll([tx({ id: "a", accountId: "hapoalim", accountType: "CHECKING", amount: -4500, description: "מקס איט פיננסים" })], accounts, [], ids)
    expect(r.get("a")).toMatchObject({ isExcluded: true, exclusionReason: "card_charge", balanceCategoryId: 13 })
  })

  it("pairs internal transfers between own accounts within 3 days", () => {
    const r = classifyAll(
      [
        tx({ id: "out", accountId: "hapoalim", accountType: "CHECKING", amount: -2000, transactionDate: "2026-09-03", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
        tx({ id: "in", accountId: "leumi", accountType: "CHECKING", amount: 2000, transactionDate: "2026-09-04", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
      ],
      accounts,
      [],
      ids,
    )
    expect(r.get("out")?.exclusionReason).toBe("internal_transfer")
    expect(r.get("in")?.exclusionReason).toBe("internal_transfer")
  })

  it("does not pair a far-apart credit or a non-transfer (check vs deposit); unknown bank debits are held out", () => {
    const r = classifyAll(
      [
        tx({ id: "out", accountId: "hapoalim", accountType: "CHECKING", amount: -2000, transactionDate: "2026-09-03", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
        tx({ id: "in", accountId: "leumi", accountType: "CHECKING", amount: 2000, transactionDate: "2026-09-20", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
        tx({ id: "chq", accountId: "hapoalim", accountType: "CHECKING", amount: -5000, transactionDate: "2026-09-05", description: "שיק", financyMain: "DEPOSIT", financySub: "CHQ_INCOME" }),
        tx({ id: "dep", accountId: "leumi", accountType: "CHECKING", amount: 5000, transactionDate: "2026-09-05", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
      ],
      accounts,
      [],
      ids,
    )
    expect(r.get("out")).toMatchObject({ needsReview: true, isExcluded: true, exclusionReason: "unreviewed" })
    expect(r.get("in")?.exclusionReason).toBe("income")
    expect(r.get("chq")).toMatchObject({ needsReview: true, isExcluded: true, exclusionReason: "unreviewed" })
    expect(r.get("dep")?.exclusionReason).toBe("income")
  })

  it("pairs a same-account pass-through transfer", () => {
    const r = classifyAll(
      [
        tx({ id: "in", accountId: "hapoalim", accountType: "CHECKING", amount: 150000, transactionDate: "2026-07-01", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
        tx({ id: "out", accountId: "hapoalim", accountType: "CHECKING", amount: -150000, transactionDate: "2026-07-02", financyMain: "TRANSFER", financySub: "BANK_TRANSFER" }),
      ],
      accounts,
      [],
      ids,
    )
    expect(r.get("in")?.exclusionReason).toBe("internal_transfer")
    expect(r.get("out")?.exclusionReason).toBe("internal_transfer")
  })

  it("treats bank credits as income and savings keywords as savings", () => {
    const r = classifyAll(
      [
        tx({ id: "sal", accountId: "hapoalim", accountType: "CHECKING", amount: 18000, description: "משכורת" }),
        tx({ id: "sav", accountId: "hapoalim", accountType: "CHECKING", amount: -3000, description: "הפקדה קרן השתלמות" }),
      ],
      accounts,
      [],
      ids,
    )
    expect(r.get("sal")).toMatchObject({ isExcluded: true, exclusionReason: "income" })
    expect(r.get("sav")).toMatchObject({ isExcluded: true, exclusionReason: "savings" })
  })

  it("maps Financy categories and keeps card refunds as (negative) spending", () => {
    const r = classifyAll(
      [
        tx({ id: "wolt", merchantName: "Wolt", financyMain: "FOOD_&_DRINKS", financySub: "DELIVERY" }),
        tx({ id: "shuf", merchantName: "Shufersal", financyMain: "FOOD_&_DRINKS", financySub: "GROCERIES" }),
        tx({ id: "refund", merchantName: "Zara", amount: 199, financyMain: "SHOPPING", financySub: null }),
      ],
      accounts,
      [],
      { ...ids, shopping: 5, clothing: 8 },
    )
    expect(r.get("wolt")).toMatchObject({ balanceCategoryId: 1, isExcluded: false })
    expect(r.get("shuf")?.balanceCategoryId).toBe(2)
    expect(r.get("refund")).toMatchObject({ balanceCategoryId: 8, isExcluded: false }) // Zara → clothing, refund still counts negative
  })

  it("merchant rules beat everything and unknown goes to review", () => {
    const r = classifyAll(
      [
        tx({ id: "pb", merchantName: "PAYBOX*SHOP 123", financyMain: "OTHER" }),
        tx({ id: "unk", merchantName: "SOMETHING", financyMain: "OTHER" }),
      ],
      accounts,
      [{ merchantKey: merchantKey("PAYBOX*SHOP 456", null), categoryId: 3, isExcluded: false, exclusionReason: null }],
      ids,
    )
    expect(r.get("pb")).toMatchObject({ balanceCategoryId: 3, categorySource: "merchant_rule" })
    expect(r.get("unk")?.needsReview).toBe(true)
  })

  it("uses Financy's card-charge tag, keyword rules, and sends peer payments to review", () => {
    const r = classifyAll(
      [
        tx({ id: "amex", accountId: "hapoalim", accountType: "CHECKING", amount: -6000, description: "פרימיום אקספרס", financyMain: "INCOMES_EXPENSES", financySub: "CREDIT_CARD_CHECKING" }),
        tx({ id: "spot", merchantName: "SPOTIFYIL", financyMain: "SHOPPING", financySub: "SHOPPING_OTHER" }),
        tx({ id: "fee", merchantName: "דמי כרטיס", financyMain: "OTHER", financySub: "BUSINESS_EXPENSES" }),
        tx({ id: "rav", merchantName: "מ.תחבורה - רב-פס", financyMain: null, financySub: "GOVERNMENT SERVICES" }),
        tx({ id: "bit", accountId: "amex", merchantName: "העברה ב BIT בנה\"פ", financyMain: "FINANCE", financySub: "FINANCE_OTHER" }),
        tx({ id: "ins", accountId: "hapoalim", accountType: "CHECKING", amount: -163, description: "הראל-ביטוח בריאות", financyMain: "INSURANCE", financySub: null }),
        tx({ id: "loan", accountId: "hapoalim", accountType: "CHECKING", amount: -1000, description: "הו”ק הלואה קרן", financyMain: "LOAN_TRANSACTION", financySub: "LOAN" }),
      ],
      [...accounts, { id: "amex", accountType: "CARD", role: "spending" }],
      [],
      ids,
    )
    expect(r.get("amex")).toMatchObject({ isExcluded: true, exclusionReason: "card_charge" })
    expect(r.get("spot")?.balanceCategoryId).toBe(6)
    expect(r.get("fee")?.balanceCategoryId).toBe(4)
    expect(r.get("rav")?.balanceCategoryId).toBe(3)
    expect(r.get("bit")?.needsReview).toBe(true)
    expect(r.get("ins")).toMatchObject({ balanceCategoryId: 7, needsReview: false })
    expect(r.get("loan")).toMatchObject({ balanceCategoryId: 5, needsReview: false })
  })

  it("marks ₪0 rows (fully discounted fees) as not charged", () => {
    const r = classifyAll([tx({ id: "z", accountId: "amex", amount: 0, merchantName: "דמי כרטיס /הנפקה" })], [...accounts, { id: "amex", accountType: "CARD", role: "spending" }], [], ids)
    expect(r.get("z")).toMatchObject({ isExcluded: true, exclusionReason: "zero", needsReview: false })
  })

  it("skips manually locked rows", () => {
    const r = classifyAll([tx({ id: "locked", manualLock: true })], accounts, [], ids)
    expect(r.has("locked")).toBe(false)
  })
})

describe("merchantKey", () => {
  it("normalises digits, punctuation and company suffixes", () => {
    expect(merchantKey("PAYBOX*SHOP 123", null)).toBe("paybox shop")
    expect(merchantKey('וולט בע"מ', null)).toBe("וולט")
    expect(merchantKey(null, "GOOGLE*SERVICES")).toBe("google services")
  })
})
