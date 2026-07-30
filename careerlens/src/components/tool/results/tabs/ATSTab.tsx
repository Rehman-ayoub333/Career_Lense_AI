import { AlertTriangle, CheckCircle2, CircleX, Lightbulb, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import { getAtsFixTip } from '@/lib/analysis/ats-tips'
import { cn } from '@/lib/cn'
import type { AnalysisResult, ATSStatus } from '@/types'

const STATUS: Record<ATSStatus, { className: string; icon: LucideIcon; iconClass: string }> = {
  pass: {
    className: 'border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green)/0.1)]',
    icon: CheckCircle2,
    iconClass: 'text-green-text',
  },
  fail: {
    className: 'border-[hsl(var(--red)/0.35)] bg-[hsl(var(--red)/0.1)]',
    icon: CircleX,
    iconClass: 'text-red-text',
  },
  warn: {
    className: 'border-[hsl(var(--amber)/0.35)] bg-[hsl(var(--amber)/0.1)]',
    icon: AlertTriangle,
    iconClass: 'text-amber-text',
  },
}

function summaryVariant(passed: number, total: number): BadgeVariant {
  if (passed === total) return 'pass'
  return passed >= total / 2 ? 'warn' : 'fail'
}

export function ATSTab({ result }: { result: AnalysisResult }) {
  const checks = result.ats_checks

  if (checks.length === 0) {
    return (
      <div data-testid="ats-tab">
        <EmptyState
          icon={ShieldCheck}
          title="No ATS checks available"
          description="Re-run the analysis to generate an applicant-tracking-system report."
        />
      </div>
    )
  }

  const passed = checks.filter((check) => check.status === 'pass').length

  return (
    <div data-testid="ats-tab" className="space-y-4">
      <Badge variant={summaryVariant(passed, checks.length)}>
        {passed}/{checks.length} checks passed
      </Badge>

      <ul className="space-y-2">
        {checks.map((check) => {
          const { className, icon: Icon, iconClass } = STATUS[check.status]
          const fixTip = getAtsFixTip(check)

          return (
            <li
              key={check.id}
              className={cn('rounded-[var(--radius-md)] border px-3 py-3', className)}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{check.label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{check.note}</p>

                  {fixTip ? (
                    <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[hsl(var(--bg)/0.4)] px-2 py-1.5">
                      <Lightbulb
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-text"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-text-secondary">{fixTip}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
