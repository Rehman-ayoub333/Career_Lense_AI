import type { Metadata } from 'next'

import { AnalyzeExperience } from '@/components/tool/AnalyzeExperience'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = {
  title: 'Analyze your CV',
  description:
    'Paste your CV and a job description or scholarship criteria to get your match score, skill gaps, ATS compatibility check and rewritten bullets. Free, no account, nothing stored.',
  alternates: { canonical: '/analyze' },
}

export default function AnalyzePage() {
  return (
    <>
      {/*
        A real header, replacing the `sr-only` `h1` its own source comment called
        a placeholder until the route was redesigned. It has been.

        The subtitle states the mechanism rather than an outcome — what the tool
        does (checks whether quoted text is actually in your CV) instead of what
        it promises. That is the same honesty the results screen is built around,
        and the page should not open by overselling what it then carefully
        qualifies.
      */}
      <Container as="div" className="pt-12 lg:pt-16">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Analyse your CV
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-text-secondary">
          Paste your CV and an opportunity. Every requirement is checked against your document, and
          each finding shows the text it is based on — or says plainly that none was found.
        </p>
      </Container>

      <AnalyzeExperience />
    </>
  )
}
