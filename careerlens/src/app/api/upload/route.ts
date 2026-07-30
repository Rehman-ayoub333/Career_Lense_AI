import { UPLOAD_LIMITS } from '@/lib/analysis/constants'
import type { UploadResponse } from '@/lib/api/contract'
import { createApiRoute } from '@/lib/api/route'
import { AppError } from '@/lib/errors'
import { decodeTextFile, extractTextFromPdf } from '@/lib/pdf'
import { checkUploadRateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/validators'

/** `pdf-parse` needs Node APIs (Buffer, streams); it cannot run on Edge. */
export const runtime = 'nodejs'

/** Parsing a large PDF is CPU-bound and occasionally slow. */
export const maxDuration = 30

type SupportedType = 'application/pdf' | 'text/plain'

/**
 * Resolves the file type from the declared MIME type, falling back to extension.
 *
 * Neither is trusted for PDFs — `extractTextFromPdf` re-verifies the magic bytes.
 * This function only decides which parser to *attempt*.
 */
function resolveType(file: File): SupportedType {
  const mime = file.type.toLowerCase().split(';')[0].trim()
  if (mime === 'application/pdf') return 'application/pdf'
  if (mime === 'text/plain') return 'text/plain'

  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.txt')) return 'text/plain'

  throw new AppError('FILE_INVALID', {
    publicMessage: 'Please upload a PDF or TXT file.',
    detail: `Rejected upload: mime="${mime}", name="${file.name}".`,
  })
}

export const POST = createApiRoute<UploadResponse>({
  name: 'upload',
  timeoutMs: 25_000,
  rateLimit: { check: checkUploadRateLimit, scope: 'upload' },

  async handler(request) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (cause) {
      // Previously unguarded: a malformed multipart body threw straight out of
      // the handler and the framework answered with an unhandled 500.
      throw new AppError('FILE_INVALID', {
        publicMessage: 'We could not read that upload. Please try selecting the file again.',
        detail: 'Request body was not valid multipart form data.',
        cause,
      })
    }

    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new AppError('FILE_INVALID', {
        publicMessage: 'Please choose a file to upload.',
        detail: 'No File instance present under the "file" field.',
      })
    }

    if (file.size === 0) {
      throw new AppError('FILE_INVALID', {
        publicMessage: 'That file is empty. Please choose another one.',
        detail: 'Uploaded file had zero bytes.',
      })
    }

    if (file.size > UPLOAD_LIMITS.maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      throw new AppError('FILE_INVALID', {
        publicMessage: `That file is ${sizeMb} MB. Please use a file under 4 MB.`,
        detail: `Upload exceeded size limit: ${file.size} bytes.`,
      })
    }

    const type = resolveType(file)
    const buffer = Buffer.from(await file.arrayBuffer())

    const extracted =
      type === 'application/pdf' ? await extractTextFromPdf(buffer) : decodeTextFile(buffer)

    const text = sanitizeText(extracted, UPLOAD_LIMITS.maxExtractedChars)

    if (text.length < UPLOAD_LIMITS.minExtractedChars) {
      throw new AppError('FILE_UNREADABLE', {
        publicMessage:
          'We could not find readable text in that file — it may be a scanned image. Please paste your CV text instead.',
        detail: `Only ${text.length} characters extracted from a ${file.size}-byte ${type} file.`,
      })
    }

    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
    }
  },
})
