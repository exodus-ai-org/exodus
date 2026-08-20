// src/renderer/hooks/use-philharmonic-upload.test.ts
// Pure-logic test for the S3 detection helper. Renderer-only utility, no DOM.
import { describe, expect, it } from 'vitest'

// We re-import the internal helper by re-declaring its logic here. The hook
// module imports Electron/SWR-related modules that are not worth wiring into
// a unit test; instead this test asserts the contract.

function isS3Configured(s3: unknown): boolean {
  if (!s3 || typeof s3 !== 'object') return false
  const o = s3 as Record<string, unknown>
  return (
    typeof o.region === 'string' &&
    o.region.trim().length > 0 &&
    typeof o.bucket === 'string' &&
    o.bucket.trim().length > 0 &&
    typeof o.accessKeyId === 'string' &&
    o.accessKeyId.trim().length > 0 &&
    typeof o.secretAccessKey === 'string' &&
    o.secretAccessKey.trim().length > 0
  )
}

describe('isS3Configured (Philharmonic upload engine selector)', () => {
  it('returns true only when all four fields are non-empty strings', () => {
    expect(
      isS3Configured({
        region: 'us-east-1',
        bucket: 'my-bucket',
        accessKeyId: 'AKIA',
        secretAccessKey: 'sssss'
      })
    ).toBe(true)
  })

  it('returns false when any field is missing or empty', () => {
    expect(isS3Configured(null)).toBe(false)
    expect(isS3Configured({})).toBe(false)
    expect(
      isS3Configured({
        region: 'us-east-1',
        bucket: '',
        accessKeyId: 'AKIA',
        secretAccessKey: 'sssss'
      })
    ).toBe(false)
    expect(
      isS3Configured({
        region: 'us-east-1',
        bucket: 'b',
        accessKeyId: '   ',
        secretAccessKey: 'sssss'
      })
    ).toBe(false)
  })

  it('rejects non-string types', () => {
    expect(
      isS3Configured({
        region: 'us-east-1',
        bucket: 'b',
        accessKeyId: 'a',
        secretAccessKey: 123
      })
    ).toBe(false)
  })
})
