/** Bank-side debit that is the monthly credit-card charge (card purchases are the real expenses). */
export const CARD_ISSUER_RE =
  /(מקס איט|מקס|\bmax\b|max it|כאל|\bcal\b|ישראכרט|isracard|אמריקן אקספרס|פרימיום אקספרס|\bamex\b|american express|לאומי קארד|leumi card|דיינרס|diners|כרטיסי אשראי)/i

/** Transfer to a savings / investment / pension product. */
export const SAVINGS_RE =
  /(קופת גמל|קרן השתלמות|השתלמות|פנסיה|חיסכון|חסכון|פקדון|פיקדון|מיטב|\bibi\b|פסגות|הראל פנסיה|כלל פנסיה|אלטשולר|מנורה מבטחים|מגדל מקפת|אינטראקטיב|interactive brokers|קרן נאמנות|ניירות ערך)/i

/** Recurring digital subscriptions and tools (often miscategorised as ELECTRONICS / SHOPPING by MCC). */
export const SUBSCRIPTION_RE =
  /(spotify|youtube|netflix|patreon|linkedin|openai|chatgpt|anthropic|claude|elevenlabs|heygen|railway|apple\.com\/bill|itunes|google \*|google\*|google cloud|google workspace|gsuite|google one|microsoft|adobe|notion|canva|midjourney|vercel|github|icloud|dropbox|zoom\.us|yes\b|hot mobile|cellcom|partner|pelephone|סלקום|פרטנר|פלאפון|הוט מובייל|yes )/i

/** Card / bank fees and interest. */
export const FEE_RE = /(דמי כרטיס|עמלה|עמלת|ריבית|רבית|דמי ניהול|bank fee|card fee)/i

/** Insurance premiums (health, car, home, travel) — Israeli insurers by name too. */
export const INSURANCE_RE = /(ביטוח|insurance|הפניקס|הראל[- ]|סעוד הראל|מגדל (חיים|בריאות|מקפת|ביטוח)|מנורה מבטחים|כלל ביטוח|איילון (ביטוח|חברה)|שלמה ביטוח|ליברה|ווישור|wesure|libra)/i

/** Clothing & shoes: Israeli chains and global brands (MCC often files them under generic shopping). */
export const CLOTHING_RE =
  /(zara|h&m|h & m|castro|קסטרו|\bfox\b|פוקס|renuar|רנואר|golf|גולף|hoodies|הודיס|terminal x|טרמינל|nike|נייק|adidas|אדידס|foot ?locker|פוט לוקר|timberland|asos|shein|שיין|mango|מנגו|american eagle|uniqlo|next\b|pull ?& ?bear|bershka|stradivarius|massimo dutti|tommy|levi|ralph|lacoste|crocs|קרוקס|skechers|סקצ|new balance|converse|vans|columbia|north face|נעל|נעליים|אופנה|בגדי|ביגוד|הלבשה|בוטיק|טופ טן|top ten|scoop|סקופ|comme il faut|ronen chen|רונן חן|delta|דלתא|intimissimi|women.?secret|urbanica|אורבניקה|יאנגה|נאוטיקה|nautica|ml\b|מל אופנה|119 אופנה)/i

/** Loan repayments (standing orders, mortgage). */
export const LOAN_RE = /(הלוא|הלווא|משכנתא|\bloan\b|mortgage)/i

/** Cash withdrawals: counted as spending under "other". */
export const CASH_RE = /(משיכה מבנקט|משיכת מזומן|כספומט|בנקט|\batm\b|cash withdrawal)/i

/** Public transit passes (Financy files them under GOVERNMENT SERVICES). */
export const TRANSIT_RE = /(רב-פס|רב פס|rav-pass|ravkav|רב-קו|רב קו|מ\.תחבורה)/i

/** Peer payments: could be anything, so they go to review unless a merchant rule exists. */
export const PEER_PAYMENT_RE = /(\bbit\b|(?<![\u0590-\u05FF])ביט(?![\u0590-\u05FF])|paybox|פייבוקס)/i

/** Card cashback / usage credits from the issuer. */
export const CASHBACK_RE = /(זיכוי בגין שימוש|cashback|קאשבק)/i

/** Counterparty name out of Financy's details text (Bit payee, Paybox payer, transfer creditor). */
export function counterparty(details: string | null | undefined) {
  if (!details) return null
  const m = details.match(/(?:שם המוטב|שם משלם|אל|מאת)\s*:\s*([^.·]+)/)
  return m ? m[1].trim() : null
}

/**
 * Normalised merchant key for merchant_rules: lowercase, no digits/punctuation, no company suffixes.
 * Peer payments (Bit/Paybox) and bank transfers key on the counterparty, so "Bit → Oren" is learned once.
 */
export function merchantKey(merchantName: string | null | undefined, description: string | null | undefined, details?: string | null) {
  const name = merchantName?.trim() || description?.trim() || ""
  const who = counterparty(details)
  const base = (who && (PEER_PAYMENT_RE.test(name) || /העב|העברה|transfer/i.test(name)) ? `${name} ${who}` : name).toLowerCase()
  return base
    .replace(/בע"מ|בע״מ|בעמ|ltd\.?|inc\.?|llc/g, "")
    .replace(/[\d*#_\-.,/\\'"()|:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Bank credits only (never applied to debits): who paid us. */
export const NATIONAL_INSURANCE_RE = /(בטוח לאומי|ביטוח לאומי|national insurance)/i
export const SALARY_RE = /(משכורת|שכר עבודה|\bsalary\b)/i
