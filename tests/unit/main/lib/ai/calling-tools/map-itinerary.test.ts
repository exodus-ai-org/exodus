import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { classifyPlacesFailure } =
  await import('@main/lib/ai/calling-tools/map-itinerary')

describe('classifyPlacesFailure', () => {
  it('flags the exact error from the field report (expired key)', () => {
    expect(
      classifyPlacesFailure(
        new Error(
          '3 INVALID_ARGUMENT: API key expired. Please renew the API key.'
        )
      )
    ).toBe('the Google API key has expired')
  })

  it('flags invalid / disabled / billing / permission / quota classes', () => {
    expect(classifyPlacesFailure(new Error('API_KEY_INVALID'))).toMatch(
      /invalid/
    )
    expect(
      classifyPlacesFailure(
        new Error(
          'Places API (New) has not been used in project 123 before or it is disabled'
        )
      )
    ).toMatch(/not enabled/)
    expect(
      classifyPlacesFailure(
        new Error('This API method requires billing to be enabled')
      )
    ).toMatch(/billing/)
    expect(classifyPlacesFailure(new Error('7 PERMISSION_DENIED'))).toMatch(
      /permission/
    )
    expect(
      classifyPlacesFailure(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded'))
    ).toMatch(/quota/)
  })

  it('stays silent for transient / non-actionable failures', () => {
    expect(
      classifyPlacesFailure(new Error('14 UNAVAILABLE: read ECONNRESET'))
    ).toBeNull()
    expect(
      classifyPlacesFailure(new Error('4 DEADLINE_EXCEEDED: Deadline exceeded'))
    ).toBeNull()
    expect(classifyPlacesFailure(new Error('5 NOT_FOUND'))).toBeNull()
    expect(classifyPlacesFailure('some unstructured string')).toBeNull()
  })
})
