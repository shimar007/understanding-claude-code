import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { collections, items } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, params.id));

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const collectionItems = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.collectionId, params.id),
          isNull(items.deletedAt)
        )
      );

    return NextResponse.json({ collection, items: collectionItems });
  } catch (error) {
    console.error('GET /api/collections/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}
