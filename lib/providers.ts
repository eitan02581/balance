import type { Account } from "@/db/schema"

const PROVIDER_HE: Record<string, string> = {
  hapoalim: "הפועלים",
  leumi: "לאומי",
  discount: "דיסקונט",
  mizrahi: "מזרחי טפחות",
  beinleumi: "הבינלאומי",
  otsarhahayal: "אוצר החייל",
  yahav: "יהב",
  onezero: "One Zero",
  max: "MAX",
  cal: "כאל",
  visacal: "כאל",
  amex: "אמריקן אקספרס",
  isracard: "ישראכרט",
  leumicard: "לאומי קארד",
}

export function providerHe(id: string) {
  return PROVIDER_HE[id.toLowerCase()] ?? id
}

export function accountLabel(a: Pick<Account, "providerId" | "accountName" | "displayName" | "accountNumber" | "accountType">) {
  if (a.displayName) return a.displayName
  const name = a.accountName?.trim()
  const tail = a.accountNumber ? ` ···${a.accountNumber.slice(-4)}` : ""
  return `${providerHe(a.providerId)}${name ? ` · ${name}` : tail}`
}

export const EXCLUSION_LABELS: Record<string, string> = {
  card_charge: "חיוב כרטיס אשראי",
  internal_transfer: "העברה פנימית",
  savings: "חיסכון / השקעה",
  income: "הכנסה",
  manual: "לא נספר",
  unreviewed: "ממתין לסיווג",
  zero: "לא חויב (הנחה מלאה)",
}

export const CONNECTION_STATUS_HE: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  ACTIVE: { label: "מחובר", tone: "ok" },
  CONNECTED: { label: "מחובר", tone: "ok" },
  COMPLETED: { label: "הושלם (לא מתעדכן)", tone: "warn" },
  FETCHING: { label: "מתעדכן…", tone: "ok" },
  PARTIALLY_AUTHORIZED: { label: "הרשאה חלקית", tone: "warn" },
  EXPIRED: { label: "פג תוקף", tone: "bad" },
  REVOKED: { label: "בוטל", tone: "bad" },
  INACTIVE: { label: "לא פעיל", tone: "bad" },
  CREDENTIALS_ERROR: { label: "שגיאת הזדהות", tone: "bad" },
  FETCHING_ERROR: { label: "שגיאת משיכה", tone: "bad" },
  ERROR: { label: "שגיאה", tone: "bad" },
  SUSPENDED_BY_PROVIDER: { label: "הושעה על ידי הבנק", tone: "bad" },
  TERMINATED_BY_USER: { label: "נותק", tone: "bad" },
}

/** Connection badge: status word, or an expiry warning within 14 days. */
export function connectionHealth(status: string | undefined, expiry: Date | null | undefined): { label: string; tone: "ok" | "warn" | "bad" } {
  const s = status ? (CONNECTION_STATUS_HE[status] ?? { label: status, tone: "warn" as const }) : { label: "לא ידוע", tone: "warn" as const }
  if (s.tone === "ok" && expiry) {
    const days = Math.round((expiry.getTime() - Date.now()) / 86_400_000)
    if (days <= 14) return { label: days <= 0 ? "ההרשאה פגה" : `ההרשאה פגה בעוד ${days} ימים`, tone: days <= 0 ? "bad" : "warn" }
  }
  return s
}

export const ACCOUNT_TYPE_HE: Record<string, string> = { CHECKING: "עו״ש", SAVINGS: "חיסכון", CARD: "כרטיס אשראי", LOAN: "הלוואה", SECURITIES: "ניירות ערך" }
