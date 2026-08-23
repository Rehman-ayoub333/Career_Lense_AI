# Product Specification — Final

## Product purpose
CareerLens AI tells an applicant not just whether their CV matches an opportunity, but exactly which sentence in their CV justifies that judgment, and which parts of the judgment it cannot justify at all.

## Target users
**Primary:** final-year CS/engineering students in Pakistan, India, Nigeria, Bangladesh, Egypt applying to European MS scholarships (DAAD, Stipendium Hungaricum, Erasmus Mundus, Chevening) or remote tech roles. Laptop-first, not developers. **Secondary:** a scholarship committee member or FYP examiner who tests the live tool and reads the repository. **Tertiary:** a LinkedIn/social audience seeking a free tool that works.

## Core user journey (every step defined)
1. **Land on `/`.** Understand the premise (ATS rejection is silent; scholarship committees are unmodeled by every competitor) and the mechanism (evidence, not assertion) in under 60 seconds.
2. **Arrive at `/analyze`, never blank.** Pre-populated demo CV and job description; the user can start exploring before typing anything.
3. **Provide CV.** Paste, or upload PDF/TXT (4MB cap, extraction via `pdf-parse`).
4. **Provide opportunity text.** Job description (Job mode) or scholarship criteria (Scholarship mode) — mode chosen via `ModeSelector`, `role="radiogroup"`.
5. **Analyse.** One `POST /api/analyze` call runs Stage 1 (claim extraction) and Stage 2 (deterministic verification) server-side; `LoadingOverlay` shows real completion events, not a timer.
6. **Evidence verification (visible to the user as a completed fact, not a live process they watch happen).** The response already carries `verified`/`uncertain`/`unresolved` tags per requirement.
7. **Results: the evidence document is the hero.** The user reads their own CV with inline markers rather than a list of accusations.
8. **Understand gaps.** The requirement checklist and the `unresolved` tier make clear, without a fake score-only judgment, exactly what wasn't found and where to look.
9. **Improve.** `key_actions` (gap-conditioned), the Rewrite tool, Cover Letter, Interview Prep, and Chat give the user something to do next — not just a verdict to accept.
10. **Retain (optional).** History panel, `localStorage` only, 10-session cap, restore/delete.
11. **Share (optional).** A share-card PNG in the same doctrine as the in-app score — no ring gauge, no colour-by-band.

## Product principles
- **Evidence over assertion.** A claim without a checkable source span is worth less than one with — the interface says so, structurally.
- **Transparency over artificial precision.** No number is shown unless its calculation could be explained to the user in one sentence. `evidence_coverage` passes this test; the old six sub-scores did not.
- **Deterministic verification where possible.** The step that decides "verified" vs. not is a pure function over text, not a second model's opinion — testable, ablatable, and immune to the exact failure mode (hallucination) it exists to catch.
- **No fabricated confidence.** Internal similarity scores never reach the end user as fake decimal precision.
- **No misleading "missing skill" claims.** Absence of evidence in the pasted text is reported as exactly that — never escalated to "the candidate does not have this skill," which is a claim about the world CareerLens has no way to verify.
- **Privacy by design.** No account, no database, zero server-side persistence, at any point, including in research mode.
- **Explainability.** Every claim traces to a quoted span or is explicitly marked as having none.
- **Professional simplicity.** The interface is an instrument, not a dashboard — one hero surface (the document), a small number of secondary tools, no decorative chrome.

## What CareerLens explicitly does NOT claim to do
- It does not claim to know whether the user actually possesses a skill — only whether the pasted CV text contains evidence of it. **A `gap`/`unresolved` result means "not found in what you gave me," never "you don't have this."**
- It does not claim its score is a calibrated probability of being hired, admitted, or shortlisted — `score`/`verdict` remain an interpretive judgment, explicitly labeled as such, exactly as the existing `Hallmark` doctrine already states.
- It does not claim hallucination-free output. It claims a mechanism that catches a specific, measurable class of hallucination (a cited quote that isn't actually in the source) and reports how often that mechanism fires — a falsifiable, honest claim, not an absolute one.
- It does not claim to be an agent. It is a deterministic, multi-stage pipeline (`CAREERLENS_FINAL_MASTER_PLAN.md` §10) — this document does not use the word "agentic" to describe it, and no future document should either without re-litigating that decision explicitly.
- It does not claim fairness has been achieved. It claims fairness will be *measured* (Experiment 2), and reports whatever that measurement finds, including a null result.
- It does not retain, sell, analyze, or transmit user CVs beyond the single request needed to serve the analysis.
