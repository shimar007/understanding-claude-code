import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { prompts, collections, items } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { generateCollection } from '@/lib/llm';

/**
 * REGENERATION LIFECYCLE
 * ----------------------
 * When a user re-executes a prompt, we need a clear policy for what happens
 * to previously generated content. Our approach:
 *
 *   1. Archive all existing "completed" or "pending" collections for this prompt
 *      — they become status='archived', invisible by default but queryable for history
 *   2. Create a new Collection with status='pending'
 *   3. Call the LLM; on success, create Items and mark collection 'completed'
 *   4. On failure, mark collection 'failed' with an error message
 *
 * Why archive instead of delete?
 *   - Preserves the full generation history (useful for comparison, auditing)
 *   - Non-destructive by default — the user can review prior versions
 *   - The UI shows only the active collection, keeping the view clean
 *
 * Why a new Collection rather than overwriting items?
 *   - The LLM may return a completely different set of items on regeneration
 *   - Overwriting conflates edit history (user changes) with LLM regeneration
 *   - A new Collection record gives us clean token/duration metrics per run
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Load the prompt
    const [prompt] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id));

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // 2. Archive all active (non-archived, non-failed) collections for this prompt
    await db
      .update(collections)
      .set({ status: 'archived' })
      .where(
        and(
          eq(collections.promptId, prompt.id),
          ne(collections.status, 'archived'),
          ne(collections.status, 'failed')
        )
      );

    // 3. Create a new pending collection
    const collectionId = generateId('col');
    const [collection] = await db
      .insert(collections)
      .values({
        id: collectionId,
        promptId: prompt.id,
        promptSnapshot: prompt.text,
        status: 'pending',
      })
      .returning();

    // 4. Execute the LLM call
    let result;
    try {
      result = await generateCollection(prompt.text, {
        model: prompt.model,
        temperature: prompt.temperature / 10, // convert from stored integer
        systemPrompt: prompt.systemPrompt ?? undefined,
      });
    } catch (llmError) {
      // Mark collection as failed
      const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
      await db
        .update(collections)
        .set({
          status: 'failed',
          errorMessage,
          completedAt: new Date().toISOString(),
        })
        .where(eq(collections.id, collectionId));

      return NextResponse.json(
        { error: 'LLM generation failed', details: errorMessage, collectionId },
        { status: 502 }
      );
    }

    // 5. Persist items
    const itemRecords = result.collection.items.map((item, index) => ({
      id: generateId('itm'),
      collectionId,
      position: index,
      type: item.type,
      title: item.title,
      body: item.body,
      tags: item.tags.join(','),
    }));

    if (itemRecords.length > 0) {
      await db.insert(items).values(itemRecords);
    }

    // 6. Mark collection as completed with metadata
    const [completed] = await db
      .update(collections)
      .set({
        status: 'completed',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        completedAt: new Date().toISOString(),
      })
      .where(eq(collections.id, collectionId))
      .returning();

    // 7. Return the collection with its items
    const collectionItems = await db
      .select()
      .from(items)
      .where(eq(items.collectionId, collectionId));

    return NextResponse.json({
      collection: completed,
      items: collectionItems,
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/prompts/[id]/execute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
