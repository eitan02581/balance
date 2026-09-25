const KEYS = ["DATABASE_URL", "FINANCY_CLIENT_ID", "FINANCY_CLIENT_SECRET", "FINANCY_USER_ID", "HOUSEHOLD_PASSWORD", "SESSION_SECRET", "CRON_SECRET"] as const
export type EnvKey = (typeof KEYS)[number]

/** Read one required env var. Each feature asks only for what it needs, so a missing Financy key never breaks login. */
export function env(key: EnvKey): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing environment variable ${key}`)
  return v
}
