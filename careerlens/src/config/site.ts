/**
 * Site-wide constants.
 *
 * Author name, links and product copy were previously duplicated across the
 * layout metadata, the footer, the share card and the export file — four places
 * to update when one of them changed.
 */

export const SITE = {
  name: 'CareerLens AI',
  tagline: 'CV Match Score & ATS Analysis',
  description:
    'Free AI CV analyser. Get your match score, ATS compatibility check, skill-gap analysis and rewritten CV bullets in under a minute — for job applications and European scholarship criteria alike.',
  shortDescription:
    'Match score, ATS check, skill gaps and rewritten bullets — for jobs and scholarships.',
  locale: 'en_GB',
} as const

export const AUTHOR = {
  name: 'Rehman Ayoub',
  location: 'Pakistan',
  github: 'https://github.com/rehmanayoub/careerlens-ai',
  linkedin: 'https://linkedin.com/in/rehmanayoub',
} as const

export const SEO_KEYWORDS = [
  'CV analyser',
  'ATS checker',
  'resume scanner',
  'job match score',
  'scholarship CV review',
  'DAAD application',
  'Stipendium Hungaricum',
  'Erasmus Mundus',
  'Chevening',
  'AI resume review',
  'skill gap analysis',
  'cover letter generator',
] as const
