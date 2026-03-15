import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, body: itemBody, tags, type } = body;

    const updateData: Partial<typeof items.$inferInsert> & {
      editedAt?: string;
      updatedAt?: string;
    } = {
      editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (itemBody !== undefined) updateData.body = itemBody.trim();
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags.join(',') : tags;
    }
    if (type !== undefined) updateData.type = type;

    const [updated] = await db
      .update(items)
      .set(updateData)
      .where(eq(items.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/items/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete — preserves item for history/audit
    const [deleted] = await db
      .update(items)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(items.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/items/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
