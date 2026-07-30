import { AppError } from './errors'

/**
 * PDF text extraction.
 *
 * `pdf-parse` is imported dynamically so its (large) dependency graph is pulled in
 * only when a PDF actually arrives. The upload route is the sole consumer, and
 * most uploads in practice are plain text, so this keeps the cold-start cost of
 * the function down.
 */

/** `%PDF-` — the required opening bytes of every PDF file. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]

/**
 * Verifies the file really is a PDF.
 *
 * Extension and `Content-Type` are both attacker-controlled: a `.pdf` name and a
 * `application/pdf` header can be attached to arbitrary bytes. Checking the magic
 * number means the parser is only ever handed something in its intended format.
 */
export function looksLikePdf(buffer: Buffer): boolean {
  if (buffer.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((byte, index) => buffer[index] === byte)
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!looksLikePdf(buffer)) {
    throw new AppError('FILE_INVALID', {
      publicMessage: 'That file does not appear to be a valid PDF. Please try another file.',
      detail: 'Uploaded bytes did not start with the PDF magic number.',
    })
  }

  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })

  try {
    const result = await parser.getText()
    return result.text.trim()
  } catch (cause) {
    throw new AppError('FILE_UNREADABLE', {
      detail: 'pdf-parse could not extract text (encrypted, corrupt, or image-only).',
      cause,
    })
  } finally {
    // Always release the parser's buffers, including on the failure path.
    await parser.destroy().catch(() => undefined)
  }
}

/**
 * Decodes a plain-text upload.
 *
 * `fatal: true` rejects invalid UTF-8 rather than silently substituting U+FFFD,
 * which is what turns a mis-encoded CV into a page of replacement characters that
 * the model then tries to analyse.
 */
export function decodeTextFile(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).trim()
  } catch {
    // Fall back to a lenient decode; a partially readable CV beats a hard failure.
    return new TextDecoder('utf-8').decode(buffer).trim()
  }
}
