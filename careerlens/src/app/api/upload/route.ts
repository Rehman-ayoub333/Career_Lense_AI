import { NextRequest, NextResponse } from 'next/server'

import { extractTextFromPdf } from '@/lib/pdf-parser'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/validators'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

function getFileType(file: File): string {
  const mime = file.type.toLowerCase()
  if (ALLOWED_TYPES.has(mime)) {
    return mime
  }

  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (name.endsWith('.txt')) return 'text/plain'

  return ''
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-forwarded-for') ?? 'upload-local'
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

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string' || !(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: 'PARSE_ERROR',
        message: 'Please upload a file in the file field.',
      },
      { status: 400 }
    )
  }

  const mimeType = getFileType(file)
  if (!mimeType) {
    return NextResponse.json(
      {
        success: false,
        error: 'WRONG_TYPE',
        message: 'Please upload a PDF, DOCX, or TXT file.',
      },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please use a file under 4MB.`,
      },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let extractedText = ''

  try {
    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPdf(buffer)
    } else if (mimeType === 'text/plain') {
      extractedText = new TextDecoder('utf-8').decode(buffer)
    } else {
      extractedText = new TextDecoder('utf-8').decode(buffer)
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'PARSE_ERROR',
        message: 'We could not read this file. Please paste your CV text manually below.',
      },
      { status: 400 }
    )
  }

  const text = sanitizeText(extractedText, 8000)

  if (text.length < 100) {
    return NextResponse.json(
      {
        success: false,
        error: 'PARSE_ERROR',
        message: 'This looks like a scanned or empty file. Please paste your CV text manually below.',
      },
      { status: 400 }
    )
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return NextResponse.json({
    success: true,
    text,
    wordCount,
    charCount: text.length,
  })
}
