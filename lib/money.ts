const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
]

const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 })

/** ₪1,234 / −₪126 (Unicode minus). */
export function formatILS(n: number, { sign = false }: { sign?: boolean } = {}) {
  const abs = nf.format(Math.round(Math.abs(n)))
  // Isolate signed amounts as an LTR run (LRI…PDI) so "-₪303" / "+₪120" keep that visual order inside Hebrew text
  if (n < 0) return `\u2066-₪${abs}\u2069`
  return sign && n > 0 ? `\u2066+₪${abs}\u2069` : `₪${abs}`
}

/** Today's calendar date in Israel as YYYY-MM-DD. */
export function todayIL(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now)
}

/** YYYY-MM for a Date (Israel time) or a YYYY-MM-DD string. */
export function monthKey(d: Date | string = new Date()) {
  const iso = typeof d === "string" ? d : todayIL(d)
  return iso.slice(0, 7)
}

export function monthLabelHe(month: string) {
  const [y, m] = month.split("-").map(Number)
  return `${HE_MONTHS[m - 1]} ${y}`
}

export function monthNameHe(month: string) {
  const m = Number(month.split("-")[1])
  return HE_MONTHS[m - 1]
}

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Days remaining in `month` including today; 0 if the month is over. */
export function daysLeftInMonth(month: string, today = todayIL()) {
  if (today.slice(0, 7) > month) return 0
  if (today.slice(0, 7) < month) return daysInMonth(month)
  return daysInMonth(month) - Number(today.slice(8, 10)) + 1
}

export function monthRange(month: string) {
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` }
}

export function addDays(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** "לפני 7 דקות" style relative time in Hebrew. */
export function relativeTimeHe(date: Date | null | undefined, now = new Date()) {
  if (!date) return "עדיין לא סונכרן"
  const mins = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000))
  if (mins < 1) return "עכשיו"
  if (mins < 60) return `לפני ${mins} דקות`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.round(hours / 24)
  return `לפני ${days} ימים`
}

export function pct(part: number, whole: number) {
  if (whole <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)))
}

const HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
const HE_MONTHS_SHORT = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"]

/** "יום ג׳ · 1 בספט׳" from YYYY-MM-DD. Safe on server and client. */
export function dateLabelHe(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return `יום ${HE_DAYS[d.getDay()]} · ${d.getDate()} ב${HE_MONTHS_SHORT[d.getMonth()]}`
}
