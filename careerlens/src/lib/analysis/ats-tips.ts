import type { ATSCheck } from '@/types'

/**
 * Remediation copy for a failed or borderline ATS check.
 *
 * Keyed by `ATSCheck.id`. Kept out of the component because this is domain
 * content — it is reviewed and edited as copy, not as markup — and because a
 * missing key here should be obvious next to the checks it corresponds to.
 */
const ATS_FIX_TIPS: Record<string, string> = {
  headings:
    'Use standard headings: "Experience", "Education", "Skills". Avoid creative alternatives like "My Journey" or "Expertise".',
  tables:
    'Remove all tables and multi-column layouts. Use simple bullet points and single-column formatting instead.',
  contact:
    'Move your name, email, phone, and LinkedIn to the body text. Never put contact info in headers or footers.',
  keywords:
    'Copy 5-8 exact keyword phrases from the job description into your experience bullets naturally.',
  dates:
    'Use one date format consistently: "Jan 2023 - Present" or "01/2023 - Present". Never mix formats.',
  graphics:
    'Remove all images, icons, logos, and decorative elements. ATS cannot parse visual content.',
  length:
    'Keep your CV to 1-2 pages. Remove outdated roles (>10 years old) and irrelevant experience.',
  fonts: 'Use standard fonts: Arial, Calibri, Times New Roman. Avoid custom or decorative fonts.',
  research:
    'Add a dedicated "Research" or "Publications" section. List papers, conferences, or thesis work with dates.',
  leadership:
    'Document leadership roles with specific outcomes: "Led a team of 5 to deliver X, resulting in Y".',
  motivation:
    'Write 2-3 sentences in your personal statement connecting your background to the program goals.',
  academic: "List your CGPA, class rank, dean's list, or academic awards prominently near the top.",
  international:
    'Mention international experiences: exchange programs, conferences abroad, language certifications.',
  community:
    'Add volunteer work, community projects, or extracurricular leadership with measurable impact.',
  language:
    'List all languages with proficiency levels (B2, C1, native). Include test scores like IELTS or TOEFL.',
  fit: 'Reference the specific program or scholarship by name and explain why it aligns with your goals.',
}

/** Returns remediation guidance for a check, or `null` when it already passes. */
export function getAtsFixTip(check: ATSCheck): string | null {
  if (check.status === 'pass') return null
  return ATS_FIX_TIPS[check.id] ?? null
}
