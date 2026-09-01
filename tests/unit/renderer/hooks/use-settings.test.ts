import { HttpError } from '@shared/utils/http'
import { describe, expect, it } from 'vitest'

import { resolveSettingsErrorMessage } from '@/hooks/use-settings'

describe('resolveSettingsErrorMessage', () => {
  it('returns the backend-provided message for an HttpError (e.g. a 400 validation error)', () => {
    const err = new HttpError(400, 'VALIDATION_ERROR', 'Invalid model name')
    expect(resolveSettingsErrorMessage(err)).toBe('Invalid model name')
  })

  it('returns undefined for non-HttpError failures (e.g. a network drop)', () => {
    expect(resolveSettingsErrorMessage(new TypeError('Failed to fetch'))).toBe(
      undefined
    )
  })

  it('returns undefined for non-Error thrown values', () => {
    expect(resolveSettingsErrorMessage('some string')).toBe(undefined)
    expect(resolveSettingsErrorMessage(undefined)).toBe(undefined)
  })
})
