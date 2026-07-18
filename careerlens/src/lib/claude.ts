import Anthropic from '@anthropic-ai/sdk';
import { getFallbackPrompt } from './prompts';

// Initialize the Anthropic client using the environment variable.
// It will automatically pick up process.env.ANTHROPIC_API_KEY.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 2000;
const TEMPERATURE = 0; // Deterministic responses for structured JSON

/**
 * Sends a prompt to Claude and returns the raw text response.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('API_KEY_MISSING: ANTHROPIC_API_KEY environment variable is not defined.');
  }

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
    throw new Error(`AI_CALL_FAILED: Anthropic API call failed - ${message}`);
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
