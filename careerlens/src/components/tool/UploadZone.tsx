'use client'

import { CheckCircle2, CloudUpload, Loader2 } from 'lucide-react'
import React, { useRef, useState } from 'react'

const MAX_FILE_SIZE = 4 * 1024 * 1024

interface UploadZoneProps {
  onTextExtracted: (text: string) => void
}

function validateFile(file: File): string | null {
  const allowed = ['pdf', 'txt']
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (!ext || !allowed.includes(ext)) {
    return 'Please upload a PDF or TXT file.'
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return `This file is ${sizeMb}MB. Please use a file under 4MB.`
  }

  return null
}

export function UploadZone({ onTextExtracted }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'success' | 'error' | 'neutral'>('neutral')

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setStatusTone('error')
      setStatusMessage(validationError)
      return
    }

    setIsLoading(true)
    setStatusTone('neutral')
    setStatusMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as {
        success?: boolean
        text?: string
        wordCount?: number
        message?: string
      }

      if (!response.ok || !payload.success || !payload.text) {
        setStatusTone('error')
        setStatusMessage(payload.message ?? 'Could not read this file. Please paste your CV text below.')
        return
      }

      onTextExtracted(payload.text)
      setStatusTone('success')
      setStatusMessage(`CV loaded · ${payload.wordCount ?? 0} words detected`)
    } catch {
      setStatusTone('error')
      setStatusMessage('Check your internet connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      data-testid="upload-zone"
      role="button"
      aria-label="Upload CV file"
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
        if (file) {
          void handleFile(file)
        }
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
        isLoading || isDragging
          ? 'border-[hsl(var(--violet))] bg-[hsl(var(--violet-dim))]'
          : 'border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] hover:border-[hsl(var(--text-subtle))] hover:bg-[hsl(var(--card))]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleFile(file)
          }
          event.target.value = ''
        }}
      />

      {isLoading ? (
        <Loader2 className="mb-2 h-6 w-6 animate-spin text-[hsl(var(--violet))]" />
      ) : statusTone === 'success' ? (
        <CheckCircle2 className="mb-2 h-6 w-6 text-[hsl(var(--green))]" />
      ) : (
        <CloudUpload className="mb-2 h-6 w-6 text-text-subtle" />
      )}

      <div className="text-sm font-medium text-text-primary">
        {isLoading ? 'Extracting text...' : 'Drop your CV here or click to browse'}
      </div>
      <div className="mt-1 text-xs text-text-subtle">PDF or TXT · Max 4 MB</div>

      {statusMessage ? (
        <div
          className={`mt-3 text-xs font-medium ${
            statusTone === 'success'
              ? 'text-[hsl(var(--green))]'
              : statusTone === 'error'
                ? 'text-[hsl(var(--red))]'
                : 'text-text-muted'
          }`}
        >
          {statusMessage}
        </div>
      ) : null}
    </div>
  )
}
