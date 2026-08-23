# Claim Model — Final

The exact field-level schema lives in `DATA_CONTRACTS_FINAL.md` (`RequirementClaim`/`VerifiedClaim`) — this document owns the *taxonomy* of what a claim is and isn't, which that schema implements.

## Structure (restated for reference, canonical definition in `DATA_CONTRACTS_FINAL.md`)
```
Claim
 ├── requirement       (what's being assessed, in plain language)
 ├── category           (skill / experience / education / ats / research / leadership / academic)
 ├── status              (the model's own claim: matched / partial / gap)
 ├── evidence_quote      (a literal span from the CV, or null)
 ├── rationale           (one CV-specific sentence)
 └── [added by Stage 2, not the model:]
      verification        (verified / uncertain / unresolved)
      match_score          (internal only)
      hallucination_candidate (internal only)
```
A single flat `Claim` type is used for every category rather than a discriminated union per category (`SkillClaim`, `ExperienceClaim`, etc.) — this is a deliberate simplification: every category needs exactly the same fields (a requirement, a status, evidence, a rationale), and a discriminated union would add type-system ceremony without adding information. If a future category genuinely needs category-specific fields, that's the trigger to revisit this decision (record it in `ARCHITECTURAL_DECISION_REGISTER.md`), not something to anticipate now.

## Claim kinds by category, as they occur in practice (not separate types — see above)
- **Skill claims** — `category: 'skill'`, e.g. "Proficiency with Docker or equivalent containerization tools."
- **Experience claims** — `category: 'experience'`, e.g. "3+ years in a production engineering role."
- **Education claims** — `category: 'education'`, e.g. "Bachelor's degree in Computer Science or related field."
- **ATS/structural claims** — `category: 'ats'`, e.g. "Contact information present in the document body" — these are the ones with a `source: 'deterministic'` option on the paired `ATSCheck` type; note `ats_checks` is a *separate* array from `claims` in `AnalysisResult` (per `DATA_CONTRACTS_FINAL.md`), not folded into `claims` itself, because ATS checks are about the document's *form*, not the candidate's *fit* — a distinction worth keeping structurally so the evidence document view (which marks fit-relevant claims inline) doesn't get cluttered with formatting checks that have no natural span to highlight.
- **Research/leadership/academic claims** — scholarship mode only, `category: 'research' | 'leadership' | 'academic'`, e.g. "Demonstrated leadership in a research or community context."
- **Recommendation "claims"** — not a claim type at all. `key_actions` remains a flat `string[]`, generated *from* gap-tier claims but not itself a claim (it has no `evidence_quote`, no `verification` — it's a forward-looking suggestion, not a backward-looking assessment, and conflating the two types would blur exactly the distinction this document exists to protect, below).

## Positive vs. negative claims — there is no such distinction in the schema, deliberately
Every claim, regardless of whether its `status` ends up `matched`, `partial`, or `gap`, is the *same kind of object* asking the *same question* ("is there evidence for this requirement?"). There is no separate `NegativeClaim` type that asserts an absence as a fact — this is the single most important design decision in this document, and it's what makes the next section enforceable rather than aspirational.

## The distinction that must be enforced everywhere: "no evidence found" vs. "candidate lacks the skill"
A `gap`/`unresolved` claim is a statement about **the document CareerLens was given**, never a statement about **the candidate as a person**. This is enforced at three independent layers (restated from `EVIDENCE_VERIFICATION_SPEC.md`'s closing section, because it belongs in both documents and must not drift between them):
1. **Data model:** no field, anywhere in `DATA_CONTRACTS_FINAL.md`, asserts a negative fact about the candidate. `status: 'gap'` and `verification: 'unresolved'` both describe the *claim-evidence relationship*, not the candidate.
2. **Prompt instructions:** `PROMPT_ARCHITECTURE_FINAL.md`'s forbidden-behavior list explicitly bars the model from writing a `rationale` that asserts absence-in-the-world rather than absence-in-the-text (e.g. `"The candidate has never used Docker"` is forbidden; `"No mention of Docker or containerization appears in the CV"` is required).
3. **UI copy:** `FRONTEND_UX_SPEC_FINAL.md`'s microcopy for the `unresolved` tier is fixed, reviewed text ("Not found in your CV") — implementers must not paraphrase it locally, since a locally-improvised label is exactly how this rule erodes over time (per the exact failure mode `PROJECT_STATE_REPORT.md` already documented once, when `Tag variant="missing"` silently became a judgment about the person rather than the document).

## Multi-value / conflicting evidence
If a CV contains contradictory statements about the same requirement (rare but possible — e.g., a skills list claims "Docker" while the experience section never mentions it), the model is instructed (`PROMPT_ARCHITECTURE_FINAL.md`) to quote the *strongest* available evidence and set `status: 'partial'` rather than `matched`, letting Stage 2's `uncertain` tier (or a human reader looking at the marked document directly) carry the ambiguity rather than the model silently resolving it one way.
