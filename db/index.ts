import { neon } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"

import * as schema from "./schema"

export type Db = NeonHttpDatabase<typeof schema>

let instance: Db | null = null

/** Lazily connected so `next build` and unit tests never need DATABASE_URL. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    if (!instance) {
      const url = process.env.DATABASE_URL
      if (!url) throw new Error("DATABASE_URL is not set")
      instance = drizzle(neon(url), { schema })
    }
    const value = Reflect.get(instance, prop)
    return typeof value === "function" ? value.bind(instance) : value
  },
})
