// src/main/lib/secrets/mask.ts — the one shape a secret takes when it leaves
// the main process, and the write rule that makes a posted mask a no-op.
import { describe, expect, it } from 'vitest'

const { maskSecret, looksLikeMask, resolvePostedSecret } =
  await import('@main/lib/secrets/mask')

describe('maskSecret', () => {
  it('shows the last four characters of a value of 12 or more', () => {
    expect(maskSecret('sk-abcdefgh1234')).toBe('•••• 1234')
    expect(maskSecret('123456789012')).toBe('•••• 9012')
  })

  it('shows nothing of a value shorter than 12', () => {
    expect(maskSecret('short')).toBe('••••')
    expect(maskSecret('12345678901')).toBe('••••')
  })

  it('leaves an unset value unset', () => {
    expect(maskSecret(null)).toBeNull()
    expect(maskSecret(void 0)).toBeNull()
    expect(maskSecret('')).toBeNull()
  })
})

describe('looksLikeMask', () => {
  it('recognises both mask shapes and nothing else', () => {
    expect(looksLikeMask('••••')).toBe(true)
    expect(looksLikeMask('•••• abcd')).toBe(true)
    expect(looksLikeMask('sk-live-1234')).toBe(false)
    expect(looksLikeMask('•••• abcde')).toBe(false)
    expect(looksLikeMask('')).toBe(false)
    expect(looksLikeMask(null)).toBe(false)
  })
})

describe('resolvePostedSecret', () => {
  const stored = 'sk-stored-secret-9999'

  it('keeps the stored value when the post is its mask', () => {
    expect(resolvePostedSecret('•••• 9999', stored)).toBe(stored)
  })

  it('never stores a mask, even a stale one', () => {
    expect(resolvePostedSecret('•••• 0000', stored)).toBe(stored)
    expect(resolvePostedSecret('••••', null)).toBeNull()
  })

  it('clears on null or empty', () => {
    expect(resolvePostedSecret(null, stored)).toBeNull()
    expect(resolvePostedSecret('', stored)).toBe('')
  })

  it('sets anything else', () => {
    expect(resolvePostedSecret('sk-new-value-0001', stored)).toBe(
      'sk-new-value-0001'
    )
  })
})
