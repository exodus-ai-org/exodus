import {
  healthSnapshotSchema,
  healthSummarySchema,
  parseHealthSummary
} from '@exodus/shared/types/health'
import { describe, expect, it } from 'vitest'

import { SNAPSHOT, SUMMARY } from './health-fixtures'

describe('healthSnapshotSchema', () => {
  it('accepts the spec example', () => {
    expect(healthSnapshotSchema.parse(SNAPSHOT)).toEqual(SNAPSHOT)
  })

  it('accepts a category that is null or absent', () => {
    const { body: _b, ...withoutBody } = SNAPSHOT
    expect(
      healthSnapshotSchema.safeParse({ ...SNAPSHOT, sleep: null }).success
    ).toBe(true)
    expect(healthSnapshotSchema.safeParse(withoutBody).success).toBe(true)
  })

  it('rejects fields it does not know (no raw samples sneak in)', () => {
    const r = healthSnapshotSchema.safeParse({
      ...SNAPSHOT,
      samples: [{ v: 1 }]
    })
    expect(r.success).toBe(false)
  })

  it('rejects a bad date and an unknown Ody state', () => {
    expect(
      healthSnapshotSchema.safeParse({ ...SNAPSHOT, date: '1/10/2026' }).success
    ).toBe(false)
    expect(
      healthSnapshotSchema.safeParse({ ...SNAPSHOT, odyState: 'sad' }).success
    ).toBe(false)
  })
})

describe('healthSummarySchema', () => {
  it('accepts the spec example and a null suggestion', () => {
    expect(healthSummarySchema.parse(SUMMARY)).toEqual(SUMMARY)
    expect(
      healthSummarySchema.safeParse({ ...SUMMARY, memorySuggestion: null })
        .success
    ).toBe(true)
  })

  it('only suggests profile memories with a kebab-case key', () => {
    const bad = {
      ...SUMMARY,
      memorySuggestion: { section: 'topic', key: 'x', summary: 'y' }
    }
    expect(healthSummarySchema.safeParse(bad).success).toBe(false)
    const badKey = {
      ...SUMMARY,
      memorySuggestion: { ...SUMMARY.memorySuggestion, key: 'Weekday Sleep' }
    }
    expect(healthSummarySchema.safeParse(badKey).success).toBe(false)
  })
})

describe('parseHealthSummary', () => {
  it('keeps a long headline in a wordy language', () => {
    const sixty = 'Wenig Schlaf, aber dein Herz hat sich erholt – geh spazieren'
    expect(sixty).toHaveLength(60)
    expect(parseHealthSummary({ ...SUMMARY, headline: sixty })?.headline).toBe(
      sixty
    )
  })

  it('drops a bad suggestion but keeps the report', () => {
    const r = parseHealthSummary({
      ...SUMMARY,
      memorySuggestion: { section: 'topic', key: 'Bad Key', summary: '' }
    })
    expect(r).not.toBeNull()
    expect(r?.memorySuggestion).toBeNull()
    expect(r?.headline).toBe(SUMMARY.headline)
  })

  it('still rejects a bad report', () => {
    expect(parseHealthSummary({ ...SUMMARY, headline: '' })).toBeNull()
    expect(parseHealthSummary('not an object')).toBeNull()
    expect(parseHealthSummary(null)).toBeNull()
  })
})
