'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Hallmark } from '@/components/ui/Hallmark'
import { buildReport, downloadTextFile, reportFilename } from '@/lib/export'
import { analysisReference } from '@/lib/format'
import type { AnalysisSession } from '@/types'

import { Summary } from './KeyActions'
import { ShareCard } from './ShareCard'

/**
 * The apparatus field.
 *
 * Three elements, in this order and no other: the hallmark, the findings that
 * account for it, and the actions. Four things were removed, each because it was
 * doing harm rather than merely taking space.
 *
 *  - **The ring gauge.** An arc sweeping up to a figure frames a judgement as a
 *    leaderboard position. This number is shown to people who have already been
 *    rejected repeatedly, and a dial landing on 31 is a slot machine landing on
 *    a loss. It is now a struck hallmark, which states rather than performs.
 *
 *  - **Colour by band.** The score was rendered red below 41 and green above 81.
 *    A product that assesses people does not get to paint them red. The band is
 *    now carried by a word, at identical weight and colour whatever it says.
 *
 *  - **The breakdown bars.** Three constituent figures for skills, experience
 *    and education, none of which a reader could reconstruct or check. A figure
 *    that cannot be verified should not be rendered at all.
 *
 *  - **The verdict note.** A sentence of prose keyed to the band, which at the
 *    low end could only console and at the high end could only congratulate. The
 *    findings below do that work honestly, by naming what was actually found.
 *
 * The panel is otherwise unchanged: it is still sticky, still carries the same
 * three actions, and still owns the share card.
 */
export function ScorePanel({
  session,
  onNewAnalysis,
}: {
  session: AnalysisSession
  onNewAnalysis: () => void
}) {
  const { result, mode, jobTitle, date } = session

  return (
    <aside
      data-testid="score-panel"
      className="lg:sticky lg:top-20 lg:self-start"
    >
      <Hallmark score={result.score} reference={analysisReference(mode, date)} />

      <div className="mt-12 border-t border-border pt-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">Findings</p>
        <Summary items={result.key_actions} />
      </div>

      <div className="mt-12 grid gap-2 border-t border-border pt-6">
        <Button
          data-testid="new-analysis-button"
          variant="secondary"
          block
          onClick={onNewAnalysis}
        >
          New analysis
        </Button>

        <ShareCard session={session} />

        <Button
          data-testid="download-button"
          variant="ghost"
          block
          onClick={() => downloadTextFile(reportFilename(jobTitle), buildReport(session))}
        >
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Download report
        </Button>
      </div>
    </aside>
  )
}
