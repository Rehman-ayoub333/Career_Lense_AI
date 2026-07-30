/**
 * Domain types. Every shared type in the application lives here.
 *
 * API request/response envelopes live alongside the routes that produce them in
 * `lib/api/contract.ts`, so the wire format and the domain model can evolve
 * independently — but neither is ever re-declared inline in a component.
 */

export type AnalysisMode = 'job' | 'scholarship'

export type MatchVerdict = 'Weak Match' | 'Partial Match' | 'Good Match' | 'Strong Match'

export type ATSStatus = 'pass' | 'fail' | 'warn'

export interface ATSCheck {
  id: string
  label: string
  status: ATSStatus
  note: string
}

export interface InterviewQuestion {
  question: string
  skill_tested: string
  tip: string
}

export interface AnalysisResult {
  /** 0-100. */
  score: number
  skills_score: number
  experience_score: number
  education_score: number
  verdict: MatchVerdict
  verdict_note: string
  key_actions: string[]
  skills_matched: string[]
  skills_missing: string[]
  skills_extra: string[]
  keywords_present: string[]
  keywords_missing: string[]
  ats_checks: ATSCheck[]
  salary_range: string
  salary_context: string
  interview_questions: InterviewQuestion[]

  /* Scholarship mode only. */
  research_score?: number
  leadership_score?: number
  academic_score?: number
  scholarship_specific_tips?: string[]
}

export interface RewriteResult {
  original_bullets: string[]
  rewritten_bullets: string[]
}

export interface AnalysisSession {
  /** Millisecond timestamp, used as a stable React key and history id. */
  id: string
  /** ISO 8601. */
  date: string
  mode: AnalysisMode
  /** Retained so the chat tab and the re-generate action have full context. */
  cvText: string
  jdText: string
  /** First non-empty line of the description, used as the history label. */
  jobTitle: string
  result: AnalysisResult

  /**
   * `null` when the supporting generation failed.
   *
   * The score analysis is the product; the rewrite and cover letter are
   * enhancements built from two further model calls. Previously a failure in
   * either discarded the whole run — including the successful, quota-consuming
   * analysis the user had already waited for. They are now optional, and their
   * tabs offer a retry instead.
   */
  rewrite: RewriteResult | null
  coverLetter: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Distinguishes a delivered reply from an error notice rendered in the thread. */
  status?: 'ok' | 'error'
}

/** The stage the analyser UI is in. */
export type AnalysisStep = 'input' | 'loading' | 'results'
