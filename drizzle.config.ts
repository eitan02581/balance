import * as nextEnv from "@next/env"
import { defineConfig } from "drizzle-kit"

// drizzle-kit's loader exposes @next/env differently from tsx; support both shapes.
const load = (nextEnv as { loadEnvConfig?: (d: string) => void }).loadEnvConfig ?? (nextEnv as { default?: { loadEnvConfig: (d: string) => void } }).default?.loadEnvConfig
load?.(process.cwd())

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
