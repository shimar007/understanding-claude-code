import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    const conversationId = generateId('conv');
    const [conversation] = await db
      .insert(conversations)
      .values({
        id: conversationId,
        title: title || 'New Conversation',
      })
      .returning();

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/:id
 * Update a conversation's title
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, title } = await request.json();

    if (!id || !title?.trim()) {
      return NextResponse.json({ error: 'ID and title are required' }, { status: 400 });
    }

    const [conversation] = await db
      .update(conversations)
      .set({ title: title.trim() })
      .where(eq(conversations.id, id))
      .returning();

    return NextResponse.json(conversation, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/conversations error:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
