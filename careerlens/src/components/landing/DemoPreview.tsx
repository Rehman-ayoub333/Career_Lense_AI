import { Badge } from '@/components/shared/Badge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { Tag } from '@/components/shared/Tag'
import React from 'react'

export function DemoPreview() {
  return (
    <section id="demo-preview" data-testid="demo-preview" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">Here&apos;s what your analysis looks like</h2>
            <p className="text-sm text-text-muted">This analysis took 11 seconds</p>
          </div>
          <Badge label="Good Match" variant="info" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card-hover))] p-4">
            <div className="text-center">
              <div className="mb-2 text-[56px] font-[family-name:var(--font-geist)] text-blue">73</div>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Match score</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Tag label="TypeScript" variant="match" />
              <Tag label="Python" variant="match" />
              <Tag label="React" variant="match" />
              <Tag label="SQL" variant="extra" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                  <span>Skills</span>
                  <span>78%</span>
                </div>
                <ProgressBar value={78} color="hsl(var(--blue))" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                  <span>Experience</span>
                  <span>64%</span>
                </div>
                <ProgressBar value={64} color="hsl(var(--amber))" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                  <span>Education</span>
                  <span>82%</span>
                </div>
                <ProgressBar value={82} color="hsl(var(--green))" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
