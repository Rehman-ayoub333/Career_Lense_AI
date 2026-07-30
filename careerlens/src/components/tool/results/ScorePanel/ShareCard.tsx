'use client'

import { Check, Download, Share2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { drawShareCard, SHARE_CARD_ASPECT_RATIO } from '@/lib/share-card'
import type { AnalysisSession } from '@/types'

const COPIED_RESET_MS = 2000

export function ShareCard({ session }: { session: AnalysisSession }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const render = useCallback(() => {
    if (canvasRef.current) drawShareCard(canvasRef.current, session)
  }, [session])

  useEffect(() => {
    if (!isOpen) return
    // Deferred a frame so the canvas has been laid out before it is painted.
    const handle = requestAnimationFrame(render)
    return () => cancelAnimationFrame(handle)
  }, [isOpen, render])

  function flagCopied() {
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }

  function handleDownload() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `careerlens-score-${session.result.score}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  async function handleCopyImage() {
    if (!canvasRef.current) return

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob(resolve, 'image/png')
      })
      if (!blob) throw new Error('Canvas produced no image')

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      flagCopied()
    } catch {
      // Image clipboard writes are unsupported in Firefox and on insecure
      // origins; falling back to the page URL keeps the action useful.
      await navigator.clipboard.writeText(window.location.href)
      flagCopied()
    }
  }

  return (
    <>
      <Button data-testid="share-button" variant="secondary" block onClick={() => setIsOpen(true)}>
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Share Result
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Share your score card"
        size="lg"
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ aspectRatio: SHARE_CARD_ASPECT_RATIO }}
              aria-label={`Score card: ${session.result.score} out of 100, ${session.result.verdict}`}
              role="img"
            />
          </div>

          <div className="flex gap-2">
            <Button block onClick={handleDownload}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PNG
            </Button>
            <Button variant="secondary" block onClick={() => void handleCopyImage()}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-text" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Copy Image
                </>
              )}
            </Button>
          </div>

          <span role="status" aria-live="polite" className="sr-only">
            {copied ? 'Score card copied to clipboard' : ''}
          </span>
        </div>
      </Modal>
    </>
  )
}
