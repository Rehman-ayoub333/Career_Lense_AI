import { generateJson } from '@/lib/ai'
import { aggregateCoverage } from '@/lib/analysis/aggregate'
import { AI_TIMEOUT_MS, INPUT_LIMITS } from '@/lib/analysis/constants'
import { verifyClaims } from '@/lib/analysis/grounding'
import { isAnalysisDraft, normalizeAnalysisDraft } from '@/lib/analysis/guards'
import { ANALYSIS_SCHEMA, SCHOLARSHIP_ANALYSIS_SCHEMA } from '@/lib/analysis/schemas'
import { createApiRoute, readJsonBody } from '@/lib/api/route'
import { isResearchModeEnabled } from '@/lib/env'
import { AppError } from '@/lib/errors'
import {
  ANALYSIS_SYSTEM_PROMPT,
  SCHOLARSHIP_SYSTEM_PROMPT,
  getJobAnalysisPrompt,
  getScholarshipAnalysisPrompt,
} from '@/lib/prompts'
import { checkAiRateLimit } from '@/lib/rate-limit'
import { isAnalysisMode, parseObjectBody, parseTextField } from '@/lib/validators'
import type {
  AnalysisDraft,
  AnalysisResult,
  ATSCheck,
  ATSCheckDraft,
  PublicVerifiedClaim,
  ResearchAnalysisResult,
  VerifiedClaim,
} from '@/types'

/** The AI client and env access need Node APIs; pin the runtime explicitly. */
export const runtime = 'nodejs'

/**
 * Declared so the platform's function ceiling sits *above* our own budget.
 * Without it the host's default (10s on several plans) fires first, and the
 * browser receives an opaque gateway error page instead of our timeout message.
 *
 * Must be a literal: Next only statically analyses literal segment configs, and
 * an imported constant here fails the build. Kept in step with `AI_TIMEOUT_MS`.
 */
export const maxDuration = 60

/**
 * Strips the two internal fields before serialization.
 *
 * `match_score` is a similarity number that would read as precision the system
 * does not have — "0.87" shown to someone who has been rejected repeatedly
 * invites them to treat a fuzzy string match as a measurement of their career.
 * `hallucination_candidate` is worse: it is a note about the model's behaviour,
 * and to a user it would read as an accusation aimed at them.
 *
 * Both are computed on every request regardless. This is a serialization
 * boundary, not a computation one — which is exactly what makes research mode
 * the same pipeline rather than a second one.
 *
 * Written as an explicit allowlist rather than by omitting the two known
 * internal fields: a field added to `VerifiedClaim` later is then excluded by
 * default and has to be deliberately let out, instead of leaking the moment
 * someone forgets this function exists.
 */
function toPublicClaims(claims: readonly VerifiedClaim[]): PublicVerifiedClaim[] {
  return claims.map((claim) => ({
    id: claim.id,
    requirement: claim.requirement,
    category: claim.category,
    status: claim.status,
    evidence_quote: claim.evidence_quote,
    rationale: claim.rationale,
    verification: claim.verification,
  }))
}

/**
 * Records which mechanism decided each ATS check.
 *
 * Every check is the model's answer today, so every check says so. The three
 * mechanically-decidable ids (`dates`, `contact`, `tables`) become
 * `deterministic` when that logic arrives in Phase 5 — until then, claiming it
 * here would be the exact thing this field exists to prevent.
 */
function attributeAtsChecks(checks: readonly ATSCheckDraft[]): ATSCheck[] {
  return checks.map((check) => ({ ...check, source: 'model' }))
}

export const POST = createApiRoute<AnalysisResult | ResearchAnalysisResult>({
  name: 'analyze',
  timeoutMs: AI_TIMEOUT_MS.analyze,
  rateLimit: { check: checkAiRateLimit, scope: 'ai' },

  async handler(request, { signal }) {
    const body = parseObjectBody(await readJsonBody(request))
    const { mode } = body

    if (!isAnalysisMode(mode)) {
      throw new AppError('VALIDATION_ERROR', {
        publicMessage: 'Please choose either job description or scholarship mode.',
        detail: `Mode was ${JSON.stringify(mode)}.`,
      })
    }

    const isScholarship = mode === 'scholarship'

    const cvText = parseTextField(body.cvText, { label: 'CV', ...INPUT_LIMITS.cv })
    const jdText = parseTextField(body.jdText, {
      label: isScholarship ? 'scholarship criteria' : 'job description',
      ...INPUT_LIMITS.jd,
    })

    // Both are required, and the flag is the one that authorizes: a header is
    // attacker-controlled and proves nothing on its own. Defense in depth, per
    // API_CONTRACT_FINAL.md — the research shape must never appear when the
    // server has not been configured to allow it, whatever the request claims.
    const researchMode =
      isResearchModeEnabled() && request.headers.get('x-research-mode') === '1'

    /* The pipeline order is fixed and load-bearing:
       guard-validate -> normalize -> verify -> aggregate -> respond.

       Verification cannot run before normalization, because normalization is
       what resolves the evidence sentinel to null and assigns the claim ids
       the markers cite. Aggregation cannot run before verification, because it
       counts verification tiers. And nothing may run before the guard, because
       until it passes this is unvalidated model output. */

    // 1. Guard-validate. The model's raw output is an AnalysisDraft, never an
    //    AnalysisResult — it cannot produce ids, verification or coverage.
    const draft = await generateJson<AnalysisDraft>({
      label: `analyze:${mode}`,
      system: isScholarship ? SCHOLARSHIP_SYSTEM_PROMPT : ANALYSIS_SYSTEM_PROMPT,
      user: isScholarship
        ? getScholarshipAnalysisPrompt(cvText, jdText)
        : getJobAnalysisPrompt(cvText, jdText),
      schema: isScholarship ? SCHOLARSHIP_ANALYSIS_SCHEMA : ANALYSIS_SCHEMA,
      validate: isAnalysisDraft,
      signal,
    })

    // 2. Normalize: clamp the score, assign claim ids, resolve the sentinel.
    const normalized = normalizeAnalysisDraft(draft)

    // 3. Verify against the CV and only the CV. Synchronous and in-process — no
    //    second model call, no new I/O, no change to the route's time budget.
    const claims = verifyClaims(normalized.claims, cvText)

    // 4. Aggregate. Counted from the tiers above, never asked of the model.
    const coverage = aggregateCoverage(claims)

    // 5. Respond.
    const common = {
      score: normalized.score,
      verdict: normalized.verdict,
      coverage,
      key_actions: normalized.key_actions,
      salary_range: normalized.salary_range,
      salary_context: normalized.salary_context,
      interview_questions: normalized.interview_questions,
      ats_checks: attributeAtsChecks(normalized.ats_checks),
    }

    return researchMode ? { ...common, claims } : { ...common, claims: toPublicClaims(claims) }
  },
})
