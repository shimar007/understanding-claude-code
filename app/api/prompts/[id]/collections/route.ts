import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { collections, items } from '@/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';

/**
 * Returns all collections for a prompt, ordered newest-first.
 * Includes items only for the active (completed) collection to keep the
 * payload lean — archived collections just return metadata.
 *
 * Query param: ?includeArchived=true to include archived collections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const allCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.promptId, params.id))
      .orderBy(desc(collections.createdAt));

    const filtered = includeArchived
      ? allCollections
      : allCollections.filter((c) => c.status !== 'archived');

    // Find the active (most recent completed) collection
    const activeCollection = allCollections.find((c) => c.status === 'completed');

    // Fetch items for the active collection only
    let activeItems: typeof items.$inferSelect[] = [];
    if (activeCollection) {
      activeItems = await db
        .select()
        .from(items)
        .where(
          and(
            eq(items.collectionId, activeCollection.id),
            isNull(items.deletedAt)
          )
        );
    }

    return NextResponse.json({
      collections: filtered,
      activeCollection: activeCollection || null,
      activeItems,
    });
  } catch (error) {
    console.error('GET /api/prompts/[id]/collections error:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}
