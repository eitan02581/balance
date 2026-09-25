/**
 * Demo sandbox: fake data, no login, no Financy. Requires DEMO_MODE=1 AND a DATABASE_URL pointing at a database named
 * `balance_demo`, so leaving DEMO_MODE on by mistake can never open a real household's data to the public.
 */
export function isDemo() {
  if (process.env.DEMO_MODE !== "1") return false
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.slice(1) === "balance_demo"
  } catch {
    return false
  }
}
