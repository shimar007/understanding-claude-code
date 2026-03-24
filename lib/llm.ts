import Anthropic from '@anthropic-ai/sdk';
import type { ItemType } from '@/db/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * LLM OUTPUT STRUCTURE
 * --------------------
 * We ask the model to return a JSON object with a conversational `response`
 * and an array of `followups` for potential next questions.
 *
 * Using JSON mode for structured output to ensure consistency.
 */

export interface GeneratedItem {
  type: ItemType;
  title: string;
  body: string;
  tags: string[];
}

export interface GeneratedCollection {
  title: string;
  description: string;
  items: GeneratedItem[];
}

export interface GenerationResult {
  collection: GeneratedCollection;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

const SYSTEM_PROMPT = `You are a helpful, conversational AI assistant. Given a user prompt, provide a natural, engaging response in a chat-like format.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "title": "A concise title for the response (5-8 words)",
  "description": "A one-sentence summary of the response",
  "items": [
    {
      "type": "response",
      "title": "Hey there!",
      "body": "A conversational, friendly response to the user's prompt. Keep it natural and engaging, like chatting with a knowledgeable friend. Use contractions, casual language, and be personable.",
      "tags": ["response"]
    }
  ]
}

Guidelines:
- Always include exactly one 'response' item
- Make the response conversational and less formal - use "I think", "You could", "That sounds like", etc.
- Be friendly and approachable
- Do NOT wrap the JSON in markdown code blocks
- Ensure the JSON is complete and valid`;

export async function generateCollection(
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  } = {}
): Promise<GenerationResult> {
  const {
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
    systemPrompt = SYSTEM_PROMPT,
  } = options;

  const startTime = Date.now();

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const durationMs = Date.now() - startTime;

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in LLM response');
  }

  let parsed: GeneratedCollection;
  try {
    // Strip any accidental markdown fences
    const cleaned = textContent.text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM JSON output: ${textContent.text.slice(0, 200)}`);
  }

  // Validate structure
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('LLM output missing items array');
  }

  return {
    collection: parsed,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs,
  };
}
