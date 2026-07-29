import { NextRequest, NextResponse } from 'next/server'

import { callClaude } from '@/lib/claude'
import { CHAT_SYSTEM_PROMPT, getChatPrompt } from '@/lib/prompts'
import { checkRateLimit, getAIRateLimitKey } from '@/lib/rate-limit'

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
  const { message, cvText, jdText, score, missingSkills, verdict } = candidate

  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Message is required.',
      },
      { status: 400 }
    )
  }

  try {
    const prompt = getChatPrompt(
      String(cvText ?? '').slice(0, 1000),
      String(jdText ?? '').slice(0, 500),
      typeof score === 'number' ? score : 0,
      Array.isArray(missingSkills) ? (missingSkills as string[]) : [],
      String(verdict ?? ''),
      message.trim()
    )

    const reply = await Promise.race([
      callClaude(CHAT_SYSTEM_PROMPT, prompt),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 15_000)
      }),
    ])

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected server error.'

    if (errorMessage === 'AI_TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'Chat response took too long. Please try again.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AI_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
