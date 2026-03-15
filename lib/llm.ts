import Anthropic from '@anthropic-ai/sdk';
import type { ItemType } from '@/db/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * LLM OUTPUT STRUCTURE
 * --------------------
 * We ask the model to return a JSON object with a `title` (collection name)
 * and an array of `items`. Each item has a discriminated `type` field from a
 * controlled vocabulary, which drives UI rendering and future filtering.
 *
 * Using JSON mode (structured output) rather than free-form text because:
 *   1. It makes persistence straightforward — no post-processing heuristics
 *   2. It enforces a contract the UI can depend on
 *   3. It allows heterogeneous item types in a single generation
 *
 * Trade-off: structured output is slightly less "creative" than free-form,
 * but for a content management workflow, predictability beats expressiveness.
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

const SYSTEM_PROMPT = `You are a structured content generator. Given a user prompt, generate a collection of distinct, useful items.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "title": "A concise title for the whole collection (5-8 words)",
  "description": "A one-sentence summary of the collection",
  "items": [
    {
      "type": "insight" | "action" | "question" | "fact" | "idea" | "warning" | "summary",
      "title": "Short, punchy item title (3-8 words)",
      "body": "2-4 sentences of substantive content. Be specific and useful.",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Guidelines:
- Generate 5-10 items per collection
- Choose item types that best represent the nature of each piece of content
- Use "insight" for observations and analysis
- Use "action" for concrete next steps  
- Use "question" for things worth exploring further
- Use "fact" for verifiable statements
- Use "idea" for creative suggestions
- Use "warning" for risks or caveats
- Use "summary" for high-level synthesis
- Tags should be lowercase, single words or hyphenated phrases
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
