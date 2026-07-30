'use client'

import { Check, Copy } from 'lucide-react'
import React, { useState } from 'react'

interface CopyButtonProps {
  textToCopy: string
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      data-testid="shared-copy-button"
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--card-border))] bg-[hsl(var(--bg))] px-3 py-1.5 text-xs font-medium text-text-muted transition-all duration-200 hover:border-[hsl(var(--text-subtle))] hover:text-text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--green))]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
