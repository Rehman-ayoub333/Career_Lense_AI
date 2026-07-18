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
  score: number               // 0-100
  skills_score: number
  experience_score: number
  education_score: number
  verdict: MatchVerdict
  verdict_note: string
  key_actions: string[]       // always 3 items
  skills_matched: string[]
  skills_missing: string[]
  skills_extra: string[]
  keywords_present: string[]
  keywords_missing: string[]
  ats_checks: ATSCheck[]      // always 8 items
  salary_range: string
  salary_context: string
  interview_questions: InterviewQuestion[]  // always 5 items
  // Scholarship mode only:
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
  id: string                  // timestamp as string
  date: string                // ISO string
  mode: AnalysisMode
  cvText: string              // stored for chat context
  jdText: string
  jobTitle: string            // extracted from JD first line
  result: AnalysisResult
  rewrite: RewriteResult
  coverLetter: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AppState {
  step: 'input' | 'loading' | 'results'
  mode: AnalysisMode
  cvText: string
  jdText: string
  loadingStep: number
  currentSession: AnalysisSession | null
  chatMessages: ChatMessage[]
  error: string | null
}
