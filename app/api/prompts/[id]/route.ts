import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { prompts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [prompt] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, params.id));

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('GET /api/prompts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { text, model, systemPrompt, temperature } = body;

    const updateData: Partial<typeof prompts.$inferInsert> & { updatedAt?: string } = {
      updatedAt: new Date().toISOString(),
    };

    if (text !== undefined) updateData.text = text.trim();
    if (model !== undefined) updateData.model = model;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.temperature = Math.round(temperature * 10);

    const [updated] = await db
      .update(prompts)
      .set(updateData)
      .where(eq(prompts.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/prompts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(prompts).where(eq(prompts.id, params.id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/prompts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}
