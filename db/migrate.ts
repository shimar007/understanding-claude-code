/**
 * Migration script — run once to initialize the database schema.
 * Usage: npx tsx db/migrate.ts
 *
 * For production, prefer drizzle-kit push or migrate commands.
 */
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL || 'file:./dev.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

async function migrate() {
  console.log('Running migrations...');

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      system_prompt TEXT,
      temperature INTEGER NOT NULL DEFAULT 7,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      prompt_snapshot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'archived')),
      error_message TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS collections_prompt_id_idx ON collections(prompt_id);
    CREATE INDEX IF NOT EXISTS collections_status_idx ON collections(status);

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'insight' CHECK(type IN ('insight', 'action', 'question', 'fact', 'idea', 'warning', 'summary', 'response', 'followup')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT,
      deleted_at TEXT,
      edited_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS items_collection_id_idx ON items(collection_id);
  `);

  console.log('✓ Migrations complete');
  await client.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
