import { NextRequest, NextResponse } from 'next/server'

import { callClaude } from '@/lib/claude'
import { COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt } from '@/lib/prompts'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateTextInput } from '@/lib/validators'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-forwarded-for') ?? 'cover-local'
  const rateLimit = checkRateLimit(key)

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

    const coverLetter = await Promise.race([
      callClaude(COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt(safeCvText, safeJdText)),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 25_000)
      }),
    ])

    return NextResponse.json({ success: true, coverLetter })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'

    if (message === 'AI_TIMEOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: 'Cover letter generation took too long. Please try again.',
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
