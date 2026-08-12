import type { Metadata } from 'next'

import { AnalyzeExperience } from '@/components/tool/AnalyzeExperience'

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
        The landing page used to supply the document's only `h1`. Now that the
        tool has its own route it needs one of its own, or the page ships with no
        top-level heading for assistive technology or search engines.

        Visually hidden rather than rendered: the tool opens with its own labelled
        controls and a heading above them is redundant to a sighted user, but the
        document still owes screen readers a title. A designed page header lands
        when the analyse route itself is redesigned — this pass only moves it.
      */}
      <h1 className="sr-only">Analyze your CV</h1>

      <AnalyzeExperience />
    </>
  )
}
