export type PlanLink = { label: string; url: string }
export type PlanItem = {
  key: string
  group: string
  title: string
  why: string
  steps: string[]
  links?: PlanLink[]
  savings?: string // rough yearly impact, as text
  owner?: string // who does it, e.g. "שניכם" — edit freely
}

/**
 * A generic starter checklist for an Israeli household. It's plain data: edit, delete or add items to fit your own situation.
 * Progress is stored per `key` (table action_progress), so keep keys stable once you start checking items off.
 */
export const PLAN_GROUPS = [
  { key: "leaks", title: "שבוע 1 · לעצור דליפות", sub: "בעיקר שיחות טלפון. הכסף הכי מהיר." },
  { key: "cards", title: "שבוע 2 · כרטיסי אשראי", sub: "פחות כרטיסים, פחות עמלות, פחות בלאגן." },
  { key: "banks", title: "שבוע 3 · בנקים וזרימת הכסף", sub: "משותף / שלי / שלך, וחיסכון שיוצא לפני ההוצאות." },
  { key: "once", title: "שבוע 4 · פעם אחת ולשכוח", sub: "בדיקות שלוקחות שעה ויכולות להחזיר אלפים." },
  { key: "routine", title: "שגרה", sub: "מה שחוזר כל חודש ורבעון." },
] as const

export const PLAN_ITEMS: PlanItem[] = [
  // ---- week 1: leaks
  {
    key: "subs-audit", group: "leaks", owner: "שניכם",
    title: "לעבור על המנויים הקבועים ולבטל מה שלא בשימוש",
    why: "מנוי שלא השתמשתם בו החודש הוא הכסף הכי קל לחסוך.",
    steps: ["לפתוח את עמוד התובנות ב־Balance ← \"מנויים קבועים\"", "לכל מנוי: השתמשנו החודש? אם לא, לבטל", "לחפש מנויים כפולים (אותו שירות בשני כרטיסים או בשני שמות)"],
    links: [{ label: "תובנות ב־Balance", url: "/insights" }],
    savings: "₪1,000–3,000 בשנה",
  },
  {
    key: "health-insurance-overlap", group: "leaks", owner: "שניכם",
    title: "ביטוח בריאות פרטי: מה חופף לשב״ן",
    why: "ביטוח בריאות פרטי חופף בדרך כלל לשב״ן של הקופה, בעיקר בכיסוי ניתוחים.",
    steps: ["להריץ את \"הר הביטוח\" ולראות את כל הפוליסות של שניכם", "לשאול את חברת הביטוח מה כל חיוב מכסה, ומה השב״ן כבר מכסה", "לא לבטל פוליסה ישנה לפני שתקופת האכשרה של חדשה נגמרת"],
    links: [{ label: "הר הביטוח", url: "https://harb.cma.gov.il/" }],
    savings: "₪1,000–2,500 בשנה",
  },

  // ---- week 2: cards
  {
    key: "close-unused-cards", group: "cards", owner: "שניכם",
    title: "לסגור כרטיסים שלא היו בשימוש שנה",
    why: "מסגרת פתוחה בלי שימוש היא סיכון ובלאגן, בלי תועלת.",
    steps: ["ב־Balance: חשבונות → כרטיסים עם 0 עסקאות", "לוודא שאין עליהם הוראת קבע או מנוי", "לסגור דרך האפליקציה או שיחה לחברת האשראי"],
    links: [{ label: "החשבונות ב־Balance", url: "/accounts" }],
  },
  {
    key: "card-fees", group: "cards", owner: "שניכם",
    title: "פטור מדמי כרטיס בכל כרטיס שנשאר",
    why: "רוב חברות האשראי מאשרות פטור בשיחה אחת, במיוחד כשיש לכם כרטיס נוסף אצלן או אצל מתחרה.",
    steps: ["תובנות ב־Balance → דמי כרטיס", "שיחה לכל חברת אשראי: לבקש פטור מלא", "אם לא מאשרים: להעביר את ההוצאות לכרטיס אחר ולסגור"],
    links: [{ label: "תובנות ב־Balance", url: "/insights" }],
    savings: "₪200–500 בשנה",
  },
  {
    key: "fx-fees", group: "cards", owner: "שניכם",
    title: "מנויים ורכישות בחו״ל: לכרטיס עם עמלת מט״ח נמוכה",
    why: "עמלות מט״ח נעות בין כ־1% ל־3%. על מנויים בדולרים זה מצטבר.",
    steps: ["לבדוק בתנאי כל כרטיס את עמלת המט״ח", "להעביר מנויים ורכישות בחו״ל לכרטיס הזול", "לחכות חודש ולוודא ב־Balance שהחיובים עברו"],
  },

  // ---- week 3: banks
  {
    key: "fee-track", group: "banks", owner: "שניכם",
    title: "מסלול עמלות בכל חשבון עו״ש",
    why: "המסלול הבסיסי מוגבל בחוק ל־₪10 בחודש, ורוב החשבונות לא נמצאים בשום מסלול.",
    steps: ["באפליקציית הבנק: עמלות → הצטרפות למסלול, או שיחה אחת", "לבקש את המסלול הבסיסי אלא אם אתם עושים הרבה פעולות בסניף"],
    links: [{ label: "בנק ישראל · השוואת עמלות", url: "https://boi.org.il/information/fees/" }],
    savings: "₪500–1,300 בשנה",
  },
  {
    key: "savings-order", group: "banks", owner: "שניכם",
    title: "הוראת קבע לחיסכון ביום שהמשכורת נכנסת",
    why: "החיסכון קורה לפני ההוצאה, לא אחריה.",
    steps: ["לפתוח חיסכון/פיקדון שלא נוח למשוך ממנו (או תיק השקעות)", "הוראת קבע ליום שהמשכורת נכנסת", "להעלות את הסכום בכל חודש שסגרתם עם בונוס"],
    links: [{ label: "ההסכם החודשי ב־Balance", url: "/settings" }],
  },
  {
    key: "idle-cash", group: "banks", owner: "שניכם",
    title: "ריבית על יתרת זכות או פיקדון יומי לעודף",
    why: "כסף שיושב בעו״ש לא מרוויח כלום. בנקים מציעים ריבית ללקוחות שמבקשים.",
    steps: ["שיחה לבנק: ריבית על יתרת זכות, או פק״מ יומי אוטומטי מעל סכום מסוים", "להשוות באתר בנק ישראל"],
    links: [{ label: "בנק ישראל · השוואת עמלות", url: "https://boi.org.il/information/fees/" }],
  },

  // ---- week 4: once
  {
    key: "har-hakesef", group: "once", owner: "שניכם",
    title: "הר הכסף: כספים אבודים",
    why: "מאתר קרנות פנסיה, גמל וחשבונות בנק רדומים. חינם. לא דרך חברות שגובות 20–40%.",
    steps: ["להיכנס עם תעודת זהות של כל אחד", "לבדוק את הרשימה ולמשוך או לאחד"],
    links: [{ label: "הר הכסף", url: "https://itur.mof.gov.il/" }],
  },
  {
    key: "pension-fees", group: "once", owner: "שניכם",
    title: "דוח מסלקה פנסיונית, והורדת דמי ניהול",
    why: "הבדל קטן בדמי הניהול הוא מאות אלפי שקלים לאורך 35 שנה.",
    steps: ["להזמין דוח מסלקה לכל אחד", "להשוות את דמי הניהול לקרנות ברירת המחדל", "לבקש הנחה מהקרן, דרך המעסיק, או לעבור קרן"],
    links: [{ label: "המסלקה הפנסיונית", url: "https://www.swiftness.co.il/" }],
    savings: "מאות אלפים לפנסיה",
  },
  {
    key: "tax-refund", group: "once", owner: "שניכם",
    title: "בדיקת החזר מס לשש השנים האחרונות",
    why: "נקודות זיכוי שלא נוצלו, חילופי עבודה, הפקדות לקרן השתלמות, חופשת לידה.",
    steps: ["לאסוף טופסי 106 מכל מעסיק לכל שנה", "להגיש דרך אתר רשות המסים או רואה חשבון"],
    links: [{ label: "כל זכות · החזר מס", url: "https://www.kolzchut.org.il/he/החזר_מס_הכנסה" }, { label: "רשות המסים", url: "https://www.gov.il/he/departments/israel_tax_authority" }],
    savings: "אלפים, חד־פעמי",
  },
  {
    key: "utilities", group: "once", owner: "שניכם",
    title: "ספק חשמל פרטי וחבילת סלולר זולה יותר",
    why: "ספק חשמל פרטי נותן הנחה קבועה, וחבילות סלולר זולות עולות חלק קטן מהמחיר של החברות הגדולות.",
    steps: ["להשוות ספקי חשמל ולעבור (לוקח 5 דקות, אין הפסקת חשמל)", "להשוות חבילות סלולר", "לתעד את התאריך כדי לבדוק שוב בעוד שנה"],
    links: [{ label: "השוואת ספקי חשמל", url: "https://www.energycenter.co.il/services/electricity-suppliers" }, { label: "השוואת חבילות סלולר", url: "https://www.zap.co.il/cellular" }],
    savings: "₪1,500–2,500 בשנה",
  },
  {
    key: "arnona", group: "once", owner: "שניכם",
    title: "לבדוק זכאות להנחה בארנונה",
    why: "הנחות לפי הכנסה וגודל משק בית. מגישים בעירייה.",
    steps: ["לבדוק את הטבלה בכל זכות", "אם זכאים: להגיש בעירייה"],
    links: [{ label: "כל זכות · הנחה בארנונה", url: "https://www.kolzchut.org.il/he/הנחה_בארנונה_לבעלי_הכנסה_נמוכה" }],
  },

  // ---- routine
  {
    key: "money-date", group: "routine", owner: "שניכם",
    title: "פגישת כסף חודשית: 20 דקות, סוגרים חודש, צובעים בונוס ליעד",
    why: "פגישה קבועה סביב מספר אחד מוסכם היא מה שמוריד ויכוחים על כסף.",
    steps: ["ב־1 לחודש: לפתוח את Balance, לסגור את החודש הקודם", "לעבור על התובנות ולעדכן את הרשימה הזאת"],
    links: [{ label: "סגירת חודש", url: "/month-close" }, { label: "היסטוריה", url: "/history" }],
  },
  {
    key: "quarterly-subs", group: "routine", owner: "שניכם",
    title: "בדיקת מנויים כל רבעון",
    why: "חלק מהחיובים רבעוניים ולא נראים בחודש אחד.",
    steps: ["תובנות → מנויים קבועים", "לבטל מה שלא בשימוש"],
    links: [{ label: "תובנות", url: "/insights" }],
  },
  {
    key: "yearly-renew", group: "routine", owner: "שניכם",
    title: "פעם בשנה: ביטוח רכב, ביטוח דירה, סלולר, חשמל",
    why: "ביטוח רכב יכול להשתנות באלפי שקלים בין חברות. שנה אחרי שנה בלי להשוות זה הפסד בטוח.",
    steps: ["להשוות חודש לפני החידוש", "לעדכן פה את התאריך של הבדיקה הבאה בהערה"],
  },
]
