import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { conversations, prompts, collections, items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';
import { generateCollection, GeneratedItem } from '@/lib/llm';

/**
 * Batch/Queue Execution Handler
 * ==============================
 * Processes multiple prompts sequentially and consolidates results
 * into a single collection with all items combined.
 *
 * Flow:
 * 1. Create queue and new prompt to hold all results
 * 2. Process each input sequentially
 * 3. Consolidate all items into one collection
 * 4. Return final result with all consolidated content
 */

interface BatchRequest {
  texts: string[];
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: BatchRequest = await req.json();
    const { texts, model, temperature, systemPrompt } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'Texts array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Filter out empty texts
    const validTexts = texts.filter((t) => t.trim());
    if (validTexts.length === 0) {
      return NextResponse.json(
        { error: 'At least one non-empty text is required' },
        { status: 400 }
      );
    }

    // 1. Create a new conversation to hold the batch
    const conversationId = generateId('conv');
    const [conversation] = await db
      .insert(conversations)
      .values({
        id: conversationId,
        title: 'Batch Processing',
      })
      .returning();

    // 2. Create a new prompt to hold the batch
    const promptId = generateId('pmt');
    const batchPromptText = `Batch Processing:\n${validTexts.map((t, i) => `[Input ${i + 1}] ${t}`).join('\n\n')}`;

    const [newPrompt] = await db
      .insert(prompts)
      .values({
        id: promptId,
        conversationId,
        text: batchPromptText,
        model: model ?? 'claude-sonnet-4-20250514',
        temperature: temperature ? Math.round(temperature * 10) : 7,
        systemPrompt: systemPrompt ?? null,
      })
      .returning();

    // 3. Create a pending collection
    const collectionId = generateId('col');
    const [collection] = await db
      .insert(collections)
      .values({
        id: collectionId,
        promptId: promptId,
        promptSnapshot: batchPromptText,
        status: 'pending',
      })
      .returning();

    // 4. Process each text sequentially and collect items
    const allItems: GeneratedItem[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalDurationMs = 0;
    const startTime = Date.now();

    for (let i = 0; i < validTexts.length; i++) {
      try {
        const result = await generateCollection(validTexts[i], {
          model,
          temperature,
          systemPrompt,
        });

        // Collect items with input index in tags
        result.collection.items.forEach((item) => {
          allItems.push({
            ...item,
            tags: [...item.tags, `input-${i + 1}`],
          });
        });

        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
        totalDurationMs += result.durationMs;
      } catch (error) {
        console.error(`Batch processing error at input ${i + 1}:`, error);
        // Continue processing other inputs even if one fails
        allItems.push({
          type: 'warning',
          title: `Input ${i + 1} Failed`,
          body: `Error processing input ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          tags: [`input-${i + 1}`, 'error'],
        });
      }
    }

    const totalBatchDurationMs = Date.now() - startTime;

    // 4. Persist all consolidated items
    if (allItems.length > 0) {
      const itemRecords = allItems.map((item, index) => ({
        id: generateId('itm'),
        collectionId,
        position: index,
        type: item.type,
        title: item.title,
        body: item.body,
        tags: item.tags.join(','),
      }));

      await db.insert(items).values(itemRecords);
    }

    // 5. Mark collection as completed with consolidated metadata
    const [completedCollection] = await db
      .update(collections)
      .set({
        status: 'completed',
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: totalBatchDurationMs,
        completedAt: new Date().toISOString(),
      })
      .where(eq(collections.id, collectionId))
      .returning();

    // 6. Fetch all items and return
    const collectionItems = await db
      .select()
      .from(items)
      .where(eq(items.collectionId, collectionId));

    return NextResponse.json(
      {
        conversation,
        prompt: newPrompt,
        collection: completedCollection,
        items: collectionItems,
        batchInfo: {
          inputCount: validTexts.length,
          itemCount: allItems.length,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/batch error:', error);
    return NextResponse.json(
      { error: 'Batch processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
