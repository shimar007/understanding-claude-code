import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { prompts, collections } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { generateId } from '@/lib/id';

export async function GET() {
  try {
    const allPrompts = await db
      .select()
      .from(prompts)
      .orderBy(desc(prompts.createdAt));

    return NextResponse.json(allPrompts);
  } catch (error) {
    console.error('GET /api/prompts error:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, model, systemPrompt, temperature } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    const id = generateId('pmt');
    const [prompt] = await db
      .insert(prompts)
      .values({
        id,
        text: text.trim(),
        model: model || 'claude-sonnet-4-20250514',
        systemPrompt: systemPrompt || null,
        temperature: temperature !== undefined ? Math.round(temperature * 10) : 7,
      })
      .returning();

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error('POST /api/prompts error:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}
