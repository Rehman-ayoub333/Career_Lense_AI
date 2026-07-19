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
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet-dim px-3 py-2 text-xs font-semibold text-violet"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
