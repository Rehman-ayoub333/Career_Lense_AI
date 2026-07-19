import { CheckCircle2, AlertTriangle, CircleX } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/shared/Badge'
import type { AnalysisResult } from '@/types'

interface ATSTabProps {
  result: AnalysisResult
}

const statusStyles = {
  pass: 'text-green bg-green-dim',
  fail: 'text-red bg-red-dim',
  warn: 'text-amber bg-amber-dim',
}

export function ATSTab({ result }: ATSTabProps) {
  const passed = result.ats_checks.filter((check) => check.status === 'pass').length

  return (
    <div data-testid="ats-tab" className="space-y-4">
      <Badge label={`${passed}/8 checks passed`} variant="info" />
      <div className="space-y-2">
        {result.ats_checks.map((check) => {
          const icon = check.status === 'pass' ? CheckCircle2 : check.status === 'warn' ? AlertTriangle : CircleX
          const Icon = icon
          return (
            <div key={check.id} className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${statusStyles[check.status]}`}>
              <Icon className="mt-0.5 h-4 w-4" />
              <div>
                <div className="text-sm font-medium text-text-primary">{check.label}</div>
                <div className="text-xs text-text-muted">{check.note}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
