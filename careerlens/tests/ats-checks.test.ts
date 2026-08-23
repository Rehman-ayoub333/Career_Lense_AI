import {
  attributeAtsChecks,
  DETERMINISTIC_ATS_IDS,
  runDeterministicAtsChecks,
} from '@/lib/analysis/ats-checks'
import type { ATSCheckDraft } from '@/types'

/**
 * Deterministic ATS checks (ADR-20).
 *
 * Every id gets both a conclusive and an inconclusive case, because the
 * inconclusive path is the one that carries the honesty requirement: a check
 * that cannot see enough must hand the question back to the model rather than
 * return a confident-looking verdict.
 */

const CONTACT = 'sana.iqbal@example.com | +92 300 1234567'

function draft(id: string, overrides: Partial<ATSCheckDraft> = {}): ATSCheckDraft {
  return {
    id,
    label: `Check ${id}`,
    status: 'pass',
    note: 'The model said so.',
    ...overrides,
  }
}

describe('dates', () => {
  it('passes a CV using one format throughout', () => {
    const cv = 'Engineer 01/2019 to 06/2022. Analyst 07/2022 to 04/2024.'
    const { dates } = runDeterministicAtsChecks(cv)

    expect(dates?.status).toBe('pass')
    expect(dates?.note).toContain('MM/YYYY')
  })

  it('warns when two formats are mixed, naming both', () => {
    const cv = 'Engineer 01/2019 to June 2022. Analyst 2022-07 onwards.'
    const { dates } = runDeterministicAtsChecks(cv)

    expect(dates?.status).toBe('warn')
    expect(dates?.note).toContain('mix')
  })

  it('accepts bare years as their own consistent style', () => {
    const cv = 'BSc Computer Science 2019. MSc Data Science 2021. Certification 2023.'
    const { dates } = runDeterministicAtsChecks(cv)

    expect(dates?.status).toBe('pass')
  })

  it('is INCONCLUSIVE when there are too few dates for consistency to mean anything', () => {
    // One date cannot be inconsistent with anything.
    expect(runDeterministicAtsChecks('Engineer since 01/2019.').dates).toBeUndefined()
    expect(runDeterministicAtsChecks('A CV with no dates at all.').dates).toBeUndefined()
  })
})

describe('contact', () => {
  it('passes when both an email and a phone number are present', () => {
    const { contact } = runDeterministicAtsChecks(`Sana Iqbal\n${CONTACT}`)

    expect(contact?.status).toBe('pass')
  })

  it('warns when only one of the two is present', () => {
    const emailOnly = runDeterministicAtsChecks('Sana Iqbal\nsana.iqbal@example.com')
    expect(emailOnly.contact?.status).toBe('warn')
    expect(emailOnly.contact?.note).toContain('no phone number')

    const phoneOnly = runDeterministicAtsChecks('Sana Iqbal\n+92 300 1234567')
    expect(phoneOnly.contact?.status).toBe('warn')
    expect(phoneOnly.contact?.note).toContain('no email address')
  })

  it('fails when neither appears, and says why that matters', () => {
    const { contact } = runDeterministicAtsChecks('Sana Iqbal — Software Engineer. Built things.')

    expect(contact?.status).toBe('fail')
    // The likely cause is the actionable part: extraction drops headers.
    expect(contact?.note).toContain('header or footer')
  })

  it('is never inconclusive — absence from the extracted text is itself the finding', () => {
    // Unlike the other two, this check can always decide: if the details are not
    // in the text an ATS reads, that is the answer regardless of why.
    for (const cv of ['', 'short', 'Sana Iqbal\n' + CONTACT]) {
      expect(runDeterministicAtsChecks(cv).contact).toBeDefined()
    }
  })
})

describe('tables', () => {
  const body = Array.from({ length: 8 }, (_, i) => `Line ${i} of ordinary CV prose.`).join('\n')

  it('fails a CV carrying table border characters', () => {
    const cv = `${body}\n| Skill | Years |\n|-------|-------|\n| React | 4 |\n| SQL │ 2 │`
    const { tables } = runDeterministicAtsChecks(cv)

    expect(tables?.status).toBe('fail')
    expect(tables?.note).toContain('table or border characters')
  })

  it('warns on the wide internal gaps a multi-column layout leaves behind', () => {
    const cv = Array.from(
      { length: 8 },
      (_, i) => `Role ${i}          Company ${i}          2020`
    ).join('\n')
    const { tables } = runDeterministicAtsChecks(cv)

    expect(tables?.status).toBe('warn')
  })

  it('passes a plainly linear document', () => {
    const { tables } = runDeterministicAtsChecks(body)

    expect(tables?.status).toBe('pass')
  })

  it('is INCONCLUSIVE on a document too short to judge layout from', () => {
    expect(runDeterministicAtsChecks('One line.\nTwo lines.').tables).toBeUndefined()
  })
})

describe('attributeAtsChecks — merging over the model', () => {
  const cv = `Sana Iqbal\n${CONTACT}\n${Array.from({ length: 8 }, (_, i) => `Engineer role ${i}, 01/2019 to 06/2022.`).join('\n')}`

  const modelChecks: ATSCheckDraft[] = [
    'headings',
    'tables',
    'contact',
    'keywords',
    'dates',
    'graphics',
    'length',
    'fonts',
  ].map((id) => draft(id))

  it('marks the five non-checkable ids as model-sourced, leaving their status alone', () => {
    const merged = attributeAtsChecks(modelChecks, cv)
    const modelOnly = merged.filter(
      (check) => !(DETERMINISTIC_ATS_IDS as readonly string[]).includes(check.id)
    )

    expect(modelOnly).toHaveLength(5)
    for (const check of modelOnly) {
      expect(check.source).toBe('model')
      expect(check.note).toBe('The model said so.')
    }
  })

  it('overrides the model on a conclusive deterministic check, note included', () => {
    const merged = attributeAtsChecks(modelChecks, cv)
    const contact = merged.find((check) => check.id === 'contact')

    expect(contact?.source).toBe('deterministic')
    expect(contact?.note).not.toBe('The model said so.')
  })

  it('overrides a WRONG model answer rather than deferring to it', () => {
    // The model claims contact details are missing; they are plainly present.
    // The whole point of the check is that code wins where code can see.
    const wrong = [draft('contact', { status: 'fail', note: 'No contact details found.' })]
    const [merged] = attributeAtsChecks(wrong, cv)

    expect(merged.status).toBe('pass')
    expect(merged.source).toBe('deterministic')
  })

  it('keeps the model answer when a deterministic check is inconclusive', () => {
    // Too short for the tables check to decide.
    const short = 'Sana Iqbal\nsana@example.com\n+92 300 1234567'
    const [merged] = attributeAtsChecks([draft('tables', { status: 'warn' })], short)

    expect(merged.status).toBe('warn')
    expect(merged.note).toBe('The model said so.')
    expect(merged.source).toBe('model')
  })

  it('gives every check a source, so a guess and a measurement stay distinguishable', () => {
    const merged = attributeAtsChecks(modelChecks, cv)

    expect(merged).toHaveLength(8)
    for (const check of merged) {
      expect(['deterministic', 'model']).toContain(check.source)
    }
  })

  it('preserves the order the model returned', () => {
    const merged = attributeAtsChecks(modelChecks, cv)
    expect(merged.map((check) => check.id)).toEqual(modelChecks.map((check) => check.id))
  })
})
