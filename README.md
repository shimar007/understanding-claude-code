# LLM Studio

A production-ready web application for iterative, prompt-based LLM content generation and management.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Initialize the database
npx tsx db/migrate.ts

# 4. Run
npm run dev        # development
npm run build && npm start  # production
```

The app is available at http://localhost:3000.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components for initial data load; API routes for mutations |
| Language | TypeScript (strict) | End-to-end type safety across schema, API, and UI |
| Styling | Tailwind CSS | Utility-first; custom design tokens via CSS variables |
| ORM | Drizzle ORM | Type-safe SQL; zero magic; easy to inspect and reason about |
| Database | libSQL / SQLite | Zero-config locally; production-ready via Turso |
| LLM | Anthropic Claude | Structured JSON output via system prompt engineering |

---

## Architecture

```
app/
  page.tsx                    — Server component; initial data load (SSR)
  layout.tsx
  globals.css
  api/
    prompts/
      route.ts                — GET (list), POST (create)
      [id]/
        route.ts              — GET, PATCH, DELETE
        execute/route.ts      — POST — core generation endpoint
        collections/route.ts  — GET — history for a prompt
    collections/[id]/route.ts — GET with items
    items/[id]/route.ts       — PATCH, DELETE

components/
  Studio.tsx         — Client shell; owns all state
  PromptSidebar.tsx  — Left nav; prompt list + status
  CollectionView.tsx — Main panel; prompt + generated content
  PromptComposer.tsx — Modal for creating/editing prompts
  ItemCard.tsx       — Individual item with inline editing

db/
  schema.ts          — Drizzle table definitions + type exports
  client.ts          — Singleton DB connection
  migrate.ts         — One-time schema initialisation script

lib/
  llm.ts             — Anthropic SDK wrapper; structured output parsing
  id.ts              — Prefixed ID generation
```

---

## Data Model

### Design Decisions

**Prompt → Collection → Item hierarchy**

A `Prompt` represents the user's *intent* over time. It can be edited and re-executed without loss of history.

A `Collection` is a versioned snapshot of a single LLM execution. It stores:
- `promptSnapshot` — the exact text at execution time (prompts can be edited later)
- `status` — `pending | completed | failed | archived`
- LLM metadata: token counts, duration

An `Item` is the atomic content unit. It has a discriminated `type` (`insight | action | question | fact | idea | warning | summary`) that drives UI rendering and future filtering.

**Why this hierarchy vs a flat table?**
- Flat design loses the connection between items and their source execution
- The Collection layer gives us clean per-run metrics and a well-defined lifecycle
- Items can be independently edited/deleted without affecting collection metadata

**Soft deletes on Items**
Items set `deleted_at` rather than being removed from the DB. This preserves the completeness of a generation for audit/history, while keeping the active UI clean.

---

## Regeneration Lifecycle

When the user re-runs a prompt:

1. All `completed` or `pending` collections for that prompt are marked `archived`
2. A new `Collection` is created with `status = 'pending'`
3. The LLM is called; on success, `Items` are inserted and the collection is marked `completed`
4. On failure, the collection is marked `failed` with an `errorMessage`

**Why archive instead of delete?**
- Preserves full generation history — you can see how output evolved across prompt iterations
- Non-destructive: prior work is never lost
- The UI shows only the active (`completed`) collection; archived versions are queryable via `GET /api/prompts/:id/collections?includeArchived=true`

**Why not just update existing items?**
Each LLM run may return a completely different set of items. Overwriting conflates two separate things: user edits (tracked via `edited_at`) and LLM regeneration. A new Collection makes each execution a clean, independent record.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prompts` | List all prompts |
| `POST` | `/api/prompts` | Create a prompt |
| `GET` | `/api/prompts/:id` | Get a single prompt |
| `PATCH` | `/api/prompts/:id` | Update prompt text/config |
| `DELETE` | `/api/prompts/:id` | Delete prompt + all content |
| `POST` | `/api/prompts/:id/execute` | Execute prompt → generate collection |
| `GET` | `/api/prompts/:id/collections` | List collections (history) |
| `GET` | `/api/collections/:id` | Get collection with items |
| `PATCH` | `/api/items/:id` | Edit an item |
| `DELETE` | `/api/items/:id` | Soft-delete an item |

---

## Production Deployment

For production, point to a [Turso](https://turso.tech) database:

```bash
# .env.production
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token
ANTHROPIC_API_KEY=sk-ant-...
```

No migration tooling needed — `db/migrate.ts` handles schema creation idempotently.

---

## Future Extensions

The model is designed to accommodate:
- **Multi-user**: add a `userId` FK to `Prompt`; auth via NextAuth or Clerk
- **Tags as first-class entities**: normalise the `tags` CSV into a join table
- **Export**: collections and items have stable IDs suitable for PDF/CSV export
- **Streaming**: the `/execute` endpoint can be upgraded to SSE for real-time item streaming
- **Model config UI**: `temperature` and `model` are already stored per-prompt; expose them in the Composer
- **Favourites / annotations**: add a `favoritedAt` or `comments` table linked to `items`
