/**
 * Provider contract.
 *
 * Everything above this file talks about "the model"; nothing above this file
 * knows which vendor is answering. Adding Anthropic or OpenAI later means writing
 * one file that satisfies `AiProvider` and registering it — no call site changes.
 */

/**
 * A JSON Schema subset that every major provider understands.
 * Gemini calls it `responseSchema`, OpenAI calls it `json_schema`, Anthropic
 * expresses it as a tool `input_schema` — the shape below maps onto all three.
 */
export type JsonSchema =
  | { type: 'string'; description?: string; enum?: readonly string[] }
  | { type: 'integer'; description?: string; minimum?: number; maximum?: number }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; description?: string; items: JsonSchema; minItems?: number; maxItems?: number }
  | {
      type: 'object'
      description?: string
      properties: Record<string, JsonSchema>
      required?: readonly string[]
    }

export interface AiRequest {
  /** Role and output-format instruction. Sent as a dedicated system turn. */
  system: string
  /** The task, including untrusted user content inside delimiters. */
  user: string
  /**
   * `text` returns prose. `json` asks the provider to constrain decoding to
   * `schema`, which removes an entire class of parse failures at the source.
   */
  format: 'text' | 'json'
  /** Required when `format` is `json`. Enforced by the provider where supported. */
  schema?: JsonSchema
  maxOutputTokens?: number
  temperature?: number
  /** Cancels the upstream HTTP request — not just the local promise. */
  signal?: AbortSignal
}

export interface AiResponse {
  text: string
  /** For logging and cost attribution. Providers that omit usage report zeroes. */
  usage: { inputTokens: number; outputTokens: number }
  model: string
}

export interface AiProvider {
  /** Stable identifier used in logs and the `AI_PROVIDER` env var. */
  readonly id: string
  /** True when the provider has the credentials it needs to run. */
  isConfigured(): boolean
  generate(request: AiRequest): Promise<AiResponse>
}
