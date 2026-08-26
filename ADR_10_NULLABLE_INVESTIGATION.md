# ADR-10 nullable investigation — result

ADR-22 asked, as a "worth investigating, not mandated" item:

> check whether Anthropic's `input_schema` supports a true nullable/union type
> for `evidence_quote`, which could simplify ADR-10's empty-string-sentinel
> workaround (built specifically around a Gemini limitation) — only pursue if
> it's a clean find during the swap, not a separate refactor.

**Answer: yes, Anthropic supports it. No, it was not adopted.** Both halves are
reported here because ADR-22 asked for a finding either way, and because
"supported" and "worth doing now" turned out to be different questions.

## What Anthropic supports

Anthropic's structured-output schema subset — the same subset that governs a
tool's `input_schema` under `strict: true` — accepts `null` as a basic type and
accepts `anyOf`. A genuinely nullable `evidence_quote` is therefore expressible:

```json
{ "anyOf": [{ "type": "string" }, { "type": "null" }] }
```

This is a real capability difference from Gemini, whose `responseSchema` had no
nullable/union form. The premise ADR-10 was built on — "the constrained decoder
cannot be asked for `null` here" — is **specific to Gemini and no longer true of
the provider actually in use.** ADR-10's reasoning was correct when written; the
constraint it reasoned about has been removed by the provider swap.

## Why it was not adopted

The ADR's own gate was "only pursue if it's a clean find during the swap, not a
separate refactor." It is not a clean find. Adopting the nullable would touch
four layers that the provider swap otherwise leaves completely alone:

1. **`lib/ai/types.ts`** — `JsonSchema` has no union or nullable variant. Every
   variant carries one concrete `type` and no `nullable` flag. Adding one widens
   the provider contract, which is the exact thing ADR-10 declined to do and
   which ADR-22 does not authorise either.
2. **`lib/analysis/schemas.ts`** — the `evidence_quote` field and its
   description, which currently instructs the model to emit `""`.
3. **`lib/analysis/guards.ts`** — the `""` → `null` coercion at the validation
   boundary, and the `gap`-with-non-null-quote rejection rule that is written in
   terms of the sentinel.
4. **`tests/guards.test.ts`** — at minimum the five tests that name the sentinel
   directly: rejecting a `null` quote in favour of the sentinel, accepting the
   sentinel on a `gap` claim, accepting whitespace-only as carrying no evidence,
   the ADR-10 resolution test, and the gap-rule tests built on top of them.

That is a schema-contract change with a validation-rule change and a test
rewrite behind it. Bundling it into a provider swap would mean two unrelated
behavioural changes landing in one diff, with no way to tell which one broke
something if the live-key run comes back wrong.

## The cost of not adopting it

Small, and worth stating plainly rather than implying it is free. The sentinel
survives as a workaround for a constraint that no longer exists, which is a
mild piece of debt: a future reader of `schemas.ts` will find a comment
explaining a Gemini limitation in a codebase that no longer calls Gemini. That
comment has been updated to say so rather than left to mislead.

Nothing downstream is affected either way. `guards.ts` normalises at the
boundary, so `grounding.ts` and everything past it receive `string | null`
exactly as `CLAIM_MODEL_FINAL.md` specifies — which is the property ADR-10 was
protecting, and it holds under both designs.

## Recommendation

Adopt the nullable as its own change, after the live-key run confirms the
Anthropic pipeline works end to end. Doing it before that means debugging a
schema change and a provider change at the same time. Doing it as part of this
swap means the diff cannot be reviewed as one idea.

If adopted, it should be its own ADR superseding ADR-10 — the sentinel is a
documented contract, not an implementation detail, and removing it changes what
the model is instructed to emit.
