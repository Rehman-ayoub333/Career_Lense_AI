'use client'

import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'

import type { UploadResponse } from '@/lib/api/contract'
import { postFormData, toDisplayMessage } from '@/lib/api/client'
import { UPLOAD_LIMITS } from '@/lib/analysis/constants'
import { cn } from '@/lib/cn'

const MAX_MB = Math.round(UPLOAD_LIMITS.maxBytes / (1024 * 1024))
const ACCEPT = UPLOAD_LIMITS.acceptedExtensions.join(',')

type Tone = 'success' | 'error' | 'neutral'

/**
 * Client-side pre-checks.
 *
 * The server validates the same rules — this only spares the user a round trip
 * for a file that is obviously wrong, so the limits come from the shared
 * constants rather than being restated here.
 */
function validateFile(file: File): string | null {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

  if (!UPLOAD_LIMITS.acceptedExtensions.includes(extension as '.pdf' | '.txt')) {
    return 'Please upload a PDF or TXT file.'
  }

  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please use a file under ${MAX_MB}MB.`
  }

  return null
}

export function UploadZone({ onTextExtracted }: { onTextExtracted: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ tone: Tone; message: string } | null>(null)

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setStatus({ tone: 'error', message: validationError })
      return
    }

    setIsLoading(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { text, wordCount } = await postFormData<UploadResponse>('/api/upload', formData)
      onTextExtracted(text)
      setStatus({ tone: 'success', message: `CV loaded · ${wordCount} words detected` })
    } catch (error) {
      setStatus({ tone: 'error', message: toDisplayMessage(error) })
    } finally {
      setIsLoading(false)
    }
  }

  const isActive = isLoading || isDragging

  return (
    <div
      data-testid="upload-zone"
      role="button"
      aria-label="Upload CV file"
      aria-busy={isLoading}
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files?.[0]
        if (file) void handleFile(file)
      }}
      className={cn(
        // A solid hairline, not a dashed one. The dashed rectangle with a cloud
        // glyph centred inside it is the single most recognisable stock
        // component in software, and it is the first thing that tells a visitor
        // this page was assembled rather than designed.
        //
        // Contents sit flush left for the same reason: centring them inside a
        // bordered box is the other half of that same default.
        'flex cursor-pointer flex-col justify-center rounded-[var(--radius-md)]',
        'border px-4 py-8',
        'transition-[background-color,border-color] duration-200 ease-out',
        isActive
          ? 'border-border-strong bg-surface'
          : 'border-border bg-bg hover:border-border-strong hover:bg-surface'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
          // Cleared so re-selecting the same file fires `change` again.
          event.target.value = ''
        }}
      />

      <div className="flex items-center gap-3">
        {isLoading ? (
          <LoaderCircle
            className="h-4 w-4 shrink-0 animate-spin text-text-muted"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : status?.tone === 'success' ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-green-text"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : null}

        <span className="text-sm font-medium text-text-primary">
          {isLoading ? 'Reading the document' : 'Drop a PDF here, or select one'}
        </span>
      </div>

      {/* The specification states every accepted format, the size ceiling, and
          the one condition that will fail — before it fails. A scanned CV is the
          most common failure in this product's population, and naming it in
          advance is the whole courtesy of this component. */}
      <div className="mt-2 font-mono text-xs leading-relaxed text-text-muted">
        PDF or TXT · Max {MAX_MB} MB · A scanned page cannot be read; paste the text below instead
      </div>

      {status ? (
        <div
          // Assertive for failures: the user is mid-task and the file did not
          // load, so the message must not queue behind other announcements.
          role={status.tone === 'error' ? 'alert' : 'status'}
          aria-live={status.tone === 'error' ? 'assertive' : 'polite'}
          className={cn(
            'mt-3 text-xs font-medium',
            status.tone === 'success' && 'text-green-text',
            status.tone === 'error' && 'text-red-text',
            status.tone === 'neutral' && 'text-text-muted'
          )}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  )
}
