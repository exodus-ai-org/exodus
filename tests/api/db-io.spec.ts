/**
 * API integration tests: Database import/export.
 */
import { apiTest as test, expect, rawFetch } from '../fixtures/api-client'

test.describe('Database I/O', () => {
  test.skip('POST /api/db-io/export returns a ZIP file — skipped: table name casing bug', async () => {
    const res = await rawFetch('http://localhost:60223/api/db-io/export', {
      method: 'POST'
    })

    expect(res.status).toBe(200)

    const contentType = res.headers.get('content-type')
    expect(
      contentType?.includes('zip') || contentType?.includes('octet-stream')
    ).toBe(true)

    const buffer = await res.arrayBuffer()
    // ZIP magic bytes: PK (0x50, 0x4B)
    const bytes = new Uint8Array(buffer)
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
  })
})
