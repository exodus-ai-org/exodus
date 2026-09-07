import { discoverFeed, settings } from '@main/lib/db/schema'
import { describe, expect, it } from 'vitest'

describe('discover schema', () => {
  it('discoverFeed has the cache columns', () => {
    expect(Object.keys(discoverFeed)).toEqual(
      expect.arrayContaining(['id', 'groups', 'generatedAt', 'status', 'error'])
    )
  })

  it('settings has a discover column', () => {
    expect(Object.keys(settings)).toContain('discover')
  })
})
