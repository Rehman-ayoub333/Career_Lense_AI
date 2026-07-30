'use client'

import { Check, Copy } from 'lucide-react'

import { useClipboard } from '@/hooks/useClipboard'
import { cn } from '@/lib/cn'

import { Button } from './Button'

/**
 * Copy control with an announced result.
 *
 * The visual confirmation (icon swap plus label change) is paired with a live
 * region, because the previous version communicated success purely by swapping
 * an icon — invisible to a screen reader, which is precisely the user least able
 * to verify that a copy worked.
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  variant = 'secondary',
  className,
  iconOnly = false,
  'aria-label': ariaLabel,
}: {
  text: string
  label?: string
  copiedLabel?: string
  size?: 'sm' | 'md'
  variant?: 'secondary' | 'ghost'
  className?: string
  iconOnly?: boolean
  'aria-label'?: string
}) {
  const { copy, isCopied, error } = useClipboard()
  const copied = isCopied()

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => void copy(text)}
        aria-label={ariaLabel ?? (iconOnly ? label : undefined)}
        className={cn(iconOnly && 'h-8 w-8 px-0', className)}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-text" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {iconOnly ? null : copied ? copiedLabel : label}
      </Button>

      {/* Announces the outcome without moving focus or disturbing layout. */}
      <span role="status" aria-live="polite" className="sr-only">
        {error ?? (copied ? `${label} succeeded` : '')}
      </span>
    </>
  )
}
