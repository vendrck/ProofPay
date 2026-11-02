import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appEnv } from "@/config/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Reuse one connection pool across Next.js hot reloads in development. The
// Drizzle wrapper is rebuilt per module load, so a schema change (new columns)
// is picked up after a reload instead of the old schema being served.
const globalForDb = globalThis as unknown as { proofpaySql?: ReturnType<typeof postgres> };
let instance: Db | undefined;

export function db(): Db {
  globalForDb.proofpaySql ??= postgres(appEnv().DATABASE_URL, { max: 10 });
  instance ??= drizzle(globalForDb.proofpaySql, { schema });
  return instance;
}

export { schema };
