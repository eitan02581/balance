/**
 * Financy (main, sub) → Balance category slug, from the real taxonomy seen in this household's data.
 * null → the transaction goes to "needs review".
 */
const BY_SUB: Record<string, string> = {
  // food
  GROCERIES: "groceries",
  RESTAURANT: "eating-out",
  "COFFEE_&_SNACKS": "eating-out",
  BARS: "eating-out",
  // transport
  "CAR_&_FUEL": "car",
  TRANSPORT_OTHER: "car",
  TAXI: "car",
  PUBLIC_TRANSPORT: "car",
  PARKING: "car",
  FLIGHTS: "leisure",
  // home & bills
  COMMUNICATIONS: "home",
  UTILITIES: "home",
  "GOVERNMENT SERVICES": "home",
  GOVERNMENT_SERVICES: "home",
  "RENOVATION_&_REPAIRS": "home",
  "FURNITURE_&_INTERIOR": "home",
  "INSURANCE_&_FEES": "fees", // insurers are caught earlier by INSURANCE_RE; what remains here is fees
  LOAN: "loans",
  // shopping
  ELECTRONICS: "shopping",
  SHOPPING_OTHER: "shopping",
  "CLOTHES_&_ACCESSORIES": "clothing",
  CLOTHING: "clothing",
  SHOES: "clothing",
  FASHION: "clothing",
  GIFTS: "shopping",
  "BOOKS_&_GAMES": "shopping",
  "HOBBY_&_SPORTS_EQUIPMENT": "shopping",
  // health
  HEALTHCARE: "health",
  PHARMACY: "health",
  BEAUTY: "health",
  // leisure
  "SPORTS_&_FITNESS": "leisure",
  VACATION: "leisure",
  "CULTURE_&_EVENTS": "leisure",
  LEISURE_OTHER: "leisure",
  // other
  PETS: "pets",
  BUSINESS_EXPENSES: "other",
  CHARITY: "other",
  EDUCATION: "other",
  // money movement (excluded / review handled in classify.ts)
  CREDIT_CARD_CHECKING: "card-charge",
  SECURITIES: "savings",
}

const BY_MAIN: Record<string, string> = {
  "FOOD_&_DRINKS": "eating-out",
  TRANSPORT: "car",
  SHOPPING: "shopping",
  "HOUSEHOLD_&_SERVICES": "home",
  HOME_IMPROVEMENTS: "home",
  "HEALTH_&_BEAUTY": "health",
  LEISURE: "leisure",
  OTHER: "other",
  TRADING: "savings",
  LOAN_TRANSACTION: "loans",
  INSURANCE: "insurance",
  INSURANCES: "insurance",
  NATIONAL_INSURANCE: "income",
  SALARY: "income",
  PENSION: "income",
  BENEFITS: "income",
  INCOME: "income",
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toUpperCase().replace(/\s+/g, "_").replace(/_SERVICES$/, "_SERVICES")
}

export function mapFinancyCategory(main: string | null | undefined, sub: string | null | undefined): string | null {
  const m = norm(main)
  const s = norm(sub)
  if (s && BY_SUB[s]) return BY_SUB[s]
  if (s && BY_SUB[s.replace(/_/g, " ")]) return BY_SUB[s.replace(/_/g, " ")]
  if (m && BY_MAIN[m]) return BY_MAIN[m]
  return null
}
