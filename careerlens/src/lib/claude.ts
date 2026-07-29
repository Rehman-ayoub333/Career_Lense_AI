import Anthropic from '@anthropic-ai/sdk';
import { getFallbackPrompt } from './prompts';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0; // Deterministic responses for structured JSON

// Initialize the Anthropic client using the environment variable.
// It will automatically pick up process.env.ANTHROPIC_API_KEY.
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

/**
 * Sends a prompt to Claude and returns the raw text response.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (anthropicKey && anthropic) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || !('text' in textContent)) {
        throw new Error('AI_ERROR: Claude did not return any text content.');
      }

      return textContent.text;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (geminiKey) {
        return callGemini(systemPrompt, userPrompt, GEMINI_MODEL);
      }
      throw new Error(`AI_CALL_FAILED: Anthropic API call failed - ${message}`);
    }
  }

  if (geminiKey) {
    return callGemini(systemPrompt, userPrompt, model === DEFAULT_MODEL ? GEMINI_MODEL : model);
  }

  throw new Error('API_KEY_MISSING: No AI provider key found. Please set ANTHROPIC_API_KEY or GEMINI_API_KEY.');
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  model = GEMINI_MODEL
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    throw new Error('API_KEY_MISSING: GEMINI_API_KEY environment variable is not defined.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: TEMPERATURE,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      const detail = payload?.error?.message ?? response.statusText;
      throw new Error(`AI_CALL_FAILED: Gemini API call failed - ${response.status} ${detail}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')?.trim();
    if (!text) {
      throw new Error('AI_ERROR: Gemini did not return any text content.');
    }

    return text;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI_CALL_FAILED: Gemini API call failed - ${message}`);
  }
}

/**
 * Sends a prompt to Claude and parses the JSON response.
 * Includes a single fallback retry mechanism in case of parse errors.
 */
export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  expectedSchemaString: string,
  model = DEFAULT_MODEL
): Promise<T> {
  const rawResponse = await callClaude(systemPrompt, userPrompt, model);
  
  try {
    return parseCleanJSON<T>(rawResponse);
  } catch (parseError) {
    // Retry once with a stricter fallback prompt
    const fallbackUserPrompt = `${userPrompt}\n\n${getFallbackPrompt(expectedSchemaString)}`;
    try {
      const retryResponse = await callClaude(systemPrompt, fallbackUserPrompt, model);
      return parseCleanJSON<T>(retryResponse);
    } catch (retryError) {
      throw new Error(
        `JSON_PARSE_FAILED: Failed to parse Claude JSON response on first attempt and fallback retry. ` +
        `Original error: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
        `Retry error: ${retryError instanceof Error ? retryError.message : String(retryError)}`
      );
    }
  }
}

/**
 * Utility to strip markdown fences (```json ... ```) and parse JSON.
 */
function parseCleanJSON<T>(text: string): T {
  let cleaned = text.trim();
  
  // Strip code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  cleaned = cleaned.trim();
  
  return JSON.parse(cleaned) as T;
}
