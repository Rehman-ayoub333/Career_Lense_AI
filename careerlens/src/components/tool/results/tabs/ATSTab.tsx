import { AlertTriangle, CheckCircle2, CircleX, Lightbulb } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/shared/Badge'
import type { AnalysisResult, ATSCheck } from '@/types'

interface ATSTabProps {
  result: AnalysisResult
}

const statusStyles = {
  pass: 'border-[hsl(var(--green)/0.3)] bg-[hsl(var(--green-dim))]',
  fail: 'border-[hsl(var(--red)/0.3)] bg-[hsl(var(--red-dim))]',
  warn: 'border-[hsl(var(--amber)/0.3)] bg-[hsl(var(--amber-dim))]',
}

const ATS_FIX_TIPS: Record<string, string> = {
  headings: 'Use standard headings: "Experience", "Education", "Skills". Avoid creative alternatives like "My Journey" or "Expertise".',
  tables: 'Remove all tables and multi-column layouts. Use simple bullet points and single-column formatting instead.',
  contact: 'Move your name, email, phone, and LinkedIn to the body text. Never put contact info in headers or footers.',
  keywords: 'Copy 5-8 exact keyword phrases from the job description into your experience bullets naturally.',
  dates: 'Use one date format consistently: "Jan 2023 - Present" or "01/2023 - Present". Never mix formats.',
  graphics: 'Remove all images, icons, logos, and decorative elements. ATS cannot parse visual content.',
  length: 'Keep your CV to 1-2 pages. Remove outdated roles (>10 years old) and irrelevant experience.',
  fonts: 'Use standard fonts: Arial, Calibri, Times New Roman. Avoid custom or decorative fonts.',
  research: 'Add a dedicated "Research" or "Publications" section. List papers, conferences, or thesis work with dates.',
  leadership: 'Document leadership roles with specific outcomes: "Led a team of 5 to deliver X, resulting in Y".',
  motivation: 'Write 2-3 sentences in your personal statement connecting your background to the program goals.',
  academic: 'List your CGPA, class rank, dean\'s list, or academic awards prominently near the top.',
  international: 'Mention international experiences: exchange programs, conferences abroad, language certifications.',
  community: 'Add volunteer work, community projects, or extracurricular leadership with measurable impact.',
  language: 'List all languages with proficiency levels (B2, C1, native). Include test scores like IELTS or TOEFL.',
  fit: 'Reference the specific program or scholarship by name and explain why it aligns with your goals.',
}

function getFixTip(check: ATSCheck): string | null {
  if (check.status === 'pass') return null
  return ATS_FIX_TIPS[check.id] ?? null
}

export function ATSTab({ result }: ATSTabProps) {
  const passed = result.ats_checks.filter((check) => check.status === 'pass').length
  const total = result.ats_checks.length

  return (
    <div data-testid="ats-tab" className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge
          label={`${passed}/${total} checks passed`}
          variant={passed === total ? 'pass' : passed >= total / 2 ? 'warn' : 'fail'}
        />
      </div>

      <div className="space-y-2">
        {result.ats_checks.map((check) => {
          const Icon = check.status === 'pass' ? CheckCircle2 : check.status === 'warn' ? AlertTriangle : CircleX
          const fixTip = getFixTip(check)

          return (
            <div
              key={check.id}
              className={`rounded-[var(--radius)] border px-3 py-3 transition ${statusStyles[check.status]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">{check.label}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{check.note}</div>
                  {fixTip ? (
                    <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[hsl(var(--bg)/0.4)] px-2 py-1.5">
                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(var(--amber))]" />
                      <span className="text-xs text-text-muted">{fixTip}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
