import { Pool, type QueryResultRow } from "pg";

/**
 * Single shared connection pool. In development Next.js hot-reloads modules,
 * which would otherwise create a new pool (and leak connections) on every
 * change, so we cache it on the global object.
 */
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForPg.__pgPool ??
  new Pool({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 8888),
    database: process.env.PGDATABASE ?? "mydatabase",
    user: process.env.PGUSER ?? "myuser",
    password: process.env.PGPASSWORD ?? "mysecretpassword",
    // Keep the dashboard responsive instead of hanging when the DB is down.
    connectionTimeoutMillis: 4000,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__pgPool = pool;
}

/** Timezone used to bucket production by local day/hour. */
export const DISPLAY_TIMEZONE =
  process.env.DISPLAY_TIMEZONE ?? "America/Sao_Paulo";

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
