import { NextRequest, NextResponse } from 'next/server'

import { callClaudeJSON } from '@/lib/claude'
import { REWRITE_SYSTEM_PROMPT, getRewritePrompt } from '@/lib/prompts'
import { checkRateLimit, getAIRateLimitKey } from '@/lib/rate-limit'
import { validateTextInput } from '@/lib/validators'
import type { RewriteResult } from '@/types'

const REWRITE_SCHEMA = `{
  "original_bullets": [""],
  "rewritten_bullets": [""]
}`

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getAIRateLimitKey(req))

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Too many requests. Please wait 30 seconds.',
      },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid JSON body supplied.',
      },
      { status: 400 }
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request body must be a JSON object.',
      },
      { status: 400 }
    )
  }

  const candidate = body as Record<string, unknown>

  try {
    const safeCvText = validateTextInput(String(candidate.cvText ?? ''), 100, 8000)
    const safeJdText = validateTextInput(String(candidate.jdText ?? ''), 50, 4000)

    const result = await Promise.race([
      callClaudeJSON<RewriteResult>(REWRITE_SYSTEM_PROMPT, getRewritePrompt(safeCvText, safeJdText), REWRITE_SCHEMA),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 25_000)
      }),
    ])

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'

    if (message === 'AI_TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'Rewrite took too long. Please try again.',
        },
        { status: 503 }
      )
    }

    if (message.includes('Input must be at least')) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AI_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}
