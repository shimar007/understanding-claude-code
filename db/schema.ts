import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';

/**
 * SCHEMA DESIGN DECISIONS
 * -----------------------
 * The core model is: Prompt → Collection → Items
 *
 * A `Prompt` represents the user's intent over time — it can be edited and
 * re-executed. Each execution produces a new `Collection` (a versioned snapshot
 * of generated content), linked back to the prompt that created it.
 *
 * A `Collection` is the unit of generation. It belongs to exactly one Prompt
 * and has a lifecycle status (pending → completed | failed). Only one Collection
 * per Prompt is "active" at a time; prior collections are "archived". This gives
 * us full history without destructive writes.
 *
 * An `Item` is the atomic content unit within a Collection. We use a discriminated
 * `type` field to support heterogeneous content (insight, action, question, fact, etc.)
 * so the UI can render them differently. Items can be individually edited or deleted
 * without affecting sibling items or the parent collection's metadata.
 *
 * This model supports:
 *   - Full prompt + generation history
 *   - Non-destructive regeneration (archive old, create new)
 *   - Fine-grained content editing
 *   - Future extensions: tags, comments, favorites, export
 */

// ─── Conversations ───────────────────────────────────────────────────────────

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('New Conversation'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
}));

// ─── Prompts ─────────────────────────────────────────────────────────────────

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  // Model configuration — stored so we can replay/audit executions
  model: text('model').notNull().default('claude-sonnet-4-20250514'),
  systemPrompt: text('system_prompt'),
  temperature: integer('temperature').notNull().default(7), // stored as tenths: 7 = 0.7
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  conversationIdIdx: index('prompts_conversation_id_idx').on(table.conversationId),
}));

// ─── Collections ─────────────────────────────────────────────────────────────

export const collectionStatusValues = ['pending', 'completed', 'failed', 'archived'] as const;
export type CollectionStatus = typeof collectionStatusValues[number];

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  // The exact prompt text at time of execution — prompts can be edited,
  // so we snapshot here to preserve a faithful audit trail.
  promptSnapshot: text('prompt_snapshot').notNull(),
  status: text('status', { enum: collectionStatusValues }).notNull().default('pending'),
  errorMessage: text('error_message'),
  // LLM metadata — useful for debugging and future cost tracking
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  durationMs: integer('duration_ms'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
}, (table) => ({
  promptIdIdx: index('collections_prompt_id_idx').on(table.promptId),
  statusIdx: index('collections_status_idx').on(table.status),
}));

// ─── Items ────────────────────────────────────────────────────────────────────

export const itemTypeValues = ['insight', 'action', 'question', 'fact', 'idea', 'warning', 'summary', 'response', 'followup'] as const;
export type ItemType = typeof itemTypeValues[number];

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  // Ordering within the collection — preserves LLM's intended sequence
  position: integer('position').notNull().default(0),
  type: text('type', { enum: itemTypeValues }).notNull().default('insight'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  // Comma-separated tags — kept simple, can be normalised to a join table if needed
  tags: text('tags'),
  // Soft delete — items are hidden but preserved for history
  deletedAt: text('deleted_at'),
  // Track user edits separately from LLM output
  editedAt: text('edited_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  collectionIdIdx: index('items_collection_id_idx').on(table.collectionId),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
