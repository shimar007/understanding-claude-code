import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete the conversation (cascade will delete associated prompts, collections, items)
    await db.delete(conversations).where(eq(conversations.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
