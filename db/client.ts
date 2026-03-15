import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

/**
 * DATABASE CLIENT
 * ---------------
 * Using libSQL (SQLite-compatible) via @libsql/client.
 *
 * Local dev: writes to ./dev.db (SQLite file, zero config).
 * Production: set DATABASE_URL=libsql://your-db.turso.io + DATABASE_AUTH_TOKEN
 *   for a fully-managed distributed SQLite database via Turso.
 *
 * The globalThis singleton prevents new connections on every hot reload
 * in the Next.js dev server.
 */

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createDb() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const client = createClient(
    authToken ? { url, authToken } : { url }
  );

  return drizzle(client, { schema });
}

export const db: ReturnType<typeof drizzle<typeof schema>> =
  globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

