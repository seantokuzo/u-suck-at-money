import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init — avoids crashing during Next.js build when DATABASE_URL isn't set
let _db: NeonHttpDatabase<typeof schema> | null = null;

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_, prop, receiver) {
      if (!_db) {
        const sql = neon(process.env.DATABASE_URL!);
        _db = drizzle({ client: sql, schema });
      }
      return Reflect.get(_db, prop, receiver);
    },
  },
);
