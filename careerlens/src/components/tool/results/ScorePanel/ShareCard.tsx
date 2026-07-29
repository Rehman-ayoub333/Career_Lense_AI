'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Download, Share2, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { AnalysisSession } from '@/types'
import { getScoreColor } from '@/utils/score-color'

interface ShareCardProps {
  session: AnalysisSession
}

function drawScoreCard(canvas: HTMLCanvasElement, session: AnalysisSession): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = 1200
  const H = 630
  canvas.width = W
  canvas.height = H

  const { result, jobTitle, mode } = session
  const scoreColor = getScoreColor(result.score)

  // Background
  ctx.fillStyle = '#0D1117'
  ctx.fillRect(0, 0, W, H)

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, 'rgba(124, 58, 237, 0.06)')
  grad.addColorStop(1, 'rgba(59, 130, 246, 0.04)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Border
  ctx.strokeStyle = '#30363D'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)

  // Score circle
  const cx = 200
  const cy = 260
  const radius = 100

  // Background arc
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 16
  ctx.stroke()

  // Score arc
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + (Math.PI * 2 * result.score) / 100
  ctx.beginPath()
  ctx.arc(cx, cy, radius, startAngle, endAngle)
  ctx.strokeStyle = scoreColor
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.stroke()

  // Score number
  ctx.fillStyle = scoreColor
  ctx.font = 'bold 72px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${result.score}`, cx, cy)

  // Verdict badge
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.fillStyle = scoreColor
  const verdictY = cy + radius + 40
  const verdictWidth = ctx.measureText(result.verdict).width + 24
  ctx.beginPath()
  ctx.roundRect(cx - verdictWidth / 2, verdictY - 14, verdictWidth, 28, 14)
  ctx.fillStyle = `${scoreColor}20`
  ctx.fill()
  ctx.fillStyle = scoreColor
  ctx.textAlign = 'center'
  ctx.fillText(result.verdict.toUpperCase(), cx, verdictY + 1)

  // Right side content
  const contentX = 380
  let contentY = 80

  // Title
  ctx.fillStyle = '#F0F6FC'
  ctx.font = 'bold 28px system-ui, sans-serif'
  ctx.textAlign = 'left'
  const modeLabel = mode === 'scholarship' ? 'Scholarship Analysis' : 'CV Analysis'
  ctx.fillText(modeLabel, contentX, contentY)

  // Job title
  contentY += 40
  ctx.fillStyle = '#8B949E'
  ctx.font = '18px system-ui, sans-serif'
  const truncatedTitle = jobTitle.length > 50 ? `${jobTitle.slice(0, 47)}...` : jobTitle
  ctx.fillText(truncatedTitle, contentX, contentY)

  // Breakdown bars
  contentY += 50
  const barWidth = 700
  const barHeight = 8
  const barRadius = 4

  const bars = mode === 'scholarship'
    ? [
        { label: 'Research', value: result.research_score ?? 0, color: '#3B82F6' },
        { label: 'Leadership', value: result.leadership_score ?? 0, color: '#7C3AED' },
        { label: 'Academic', value: result.academic_score ?? 0, color: '#10B981' },
      ]
    : [
        { label: 'Skills', value: result.skills_score, color: '#3B82F6' },
        { label: 'Experience', value: result.experience_score, color: '#F59E0B' },
        { label: 'Education', value: result.education_score, color: '#10B981' },
      ]

  for (const bar of bars) {
    ctx.fillStyle = '#F0F6FC'
    ctx.font = '14px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(bar.label, contentX, contentY)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#8B949E'
    ctx.fillText(`${bar.value}%`, contentX + barWidth, contentY)

    contentY += 14
    // Background bar
    ctx.beginPath()
    ctx.roundRect(contentX, contentY, barWidth, barHeight, barRadius)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    // Value bar
    const valueWidth = Math.max(barRadius * 2, (barWidth * bar.value) / 100)
    ctx.beginPath()
    ctx.roundRect(contentX, contentY, valueWidth, barHeight, barRadius)
    ctx.fillStyle = bar.color
    ctx.fill()

    contentY += 40
  }

  // Top skills
  contentY += 10
  ctx.fillStyle = '#F0F6FC'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('MATCHED SKILLS', contentX, contentY)
  contentY += 24

  const skills = result.skills_matched.slice(0, 6)
  let skillX = contentX
  ctx.font = '13px system-ui, sans-serif'
  for (const skill of skills) {
    const w = ctx.measureText(skill).width + 20
    if (skillX + w > contentX + barWidth) break

    ctx.beginPath()
    ctx.roundRect(skillX, contentY - 12, w, 26, 13)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'
    ctx.fill()
    ctx.fillStyle = '#10B981'
    ctx.textAlign = 'left'
    ctx.fillText(skill, skillX + 10, contentY + 2)
    skillX += w + 8
  }

  // Footer / branding
  const footerY = H - 40
  ctx.fillStyle = '#30363D'
  ctx.fillRect(0, footerY - 20, W, 1)

  ctx.fillStyle = '#8B949E'
  ctx.font = '14px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('CareerLens AI', 40, footerY + 4)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#4B5563'
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillText('careerlens.vercel.app', W - 40, footerY + 4)
}

export function ShareCard({ session }: ShareCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const renderCard = useCallback(() => {
    if (canvasRef.current) {
      drawScoreCard(canvasRef.current, session)
    }
  }, [session])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(renderCard)
    }
  }, [isOpen, renderCard])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function handleDownloadPNG() {
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
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Fallback: copy URL instead
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <button
        data-testid="share-button"
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--violet)/0.4)] bg-transparent px-3 py-2 text-sm font-semibold text-[hsl(var(--violet))] transition hover:bg-[hsl(var(--violet-dim))]"
      >
        <Share2 className="h-4 w-4" />
        Share Result
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--bg)/0.85)] px-4 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl space-y-4 rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">Share your score card</div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-text-muted transition hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-[var(--radius)]">
                <canvas
                  ref={canvasRef}
                  className="w-full"
                  style={{ aspectRatio: '1200/630' }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[hsl(var(--violet))] px-3 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_20px_hsl(var(--violet)/0.4)]"
                >
                  <Download className="h-4 w-4" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyImage()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[hsl(var(--card-border))] px-3 py-2 text-sm font-semibold text-text-primary transition hover:bg-[hsl(var(--card-hover))]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-[hsl(var(--green))]" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Copy Image
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
