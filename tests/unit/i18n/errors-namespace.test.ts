import { readFileSync } from 'fs'
import { join } from 'path'

import { ErrorCode } from '@shared/constants/error-codes'
import { describe, expect, it } from 'vitest'

const errors = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'shared',
      'i18n',
      'locales',
      'en',
      'errors.json'
    ),
    'utf8'
  )
)

describe('errors namespace (en)', () => {
  it('has one non-empty key for every ErrorCode member', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(typeof errors[code]).toBe('string')
      expect(errors[code].length).toBeGreaterThan(0)
    }
  })

  it('keeps the Phase 1 scaffold keys', () => {
    expect(errors.somethingWentWrong).toBe(
      'Something went wrong. Please try again.'
    )
    expect(errors.http.unknown).toBe('Request failed.')
  })

  it('rounds out the http-status fallback set', () => {
    expect(typeof errors.http['400']).toBe('string')
    expect(typeof errors.http['404']).toBe('string')
    expect(typeof errors.http['408']).toBe('string')
    expect(typeof errors.http['429']).toBe('string')
    expect(errors.http['500']).toBe('The server ran into a problem.')
    expect(errors.http['503']).toBe('The service is temporarily unavailable.')
  })

  it('has a flat TIMEOUT key for the client-only fetch-abort case', () => {
    expect(errors.TIMEOUT).toBe('Request timed out.')
  })

  it('interpolates params for the four templated codes', () => {
    expect(errors[ErrorCode.CONFIG_INVALID]).toContain('{{label}}')
    expect(errors[ErrorCode.VALIDATION_MISSING_FIELD]).toContain('{{field}}')
    expect(errors[ErrorCode.DEEP_RESEARCH_NOT_FOUND]).toContain('{{id}}')
    expect(errors[ErrorCode.MEMORY_NOT_FOUND]).toContain('{{id}}')
  })
})
