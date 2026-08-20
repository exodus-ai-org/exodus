import { askUserRegistry } from '@main/lib/ai/philharmonic/ask-user-registry'
// src/main/lib/ai/philharmonic/ask-user-registry.test.ts
import { describe, expect, it } from 'vitest'

describe('askUserRegistry', () => {
  it('resolves a waiting question with the provided answer', async () => {
    const pending = askUserRegistry.wait('c1')
    expect(askUserRegistry.has('c1')).toBe(true)
    askUserRegistry.resolve('c1', 'the answer')
    await expect(pending).resolves.toBe('the answer')
    expect(askUserRegistry.has('c1')).toBe(false)
  })

  it('resolve on unknown conversation is a no-op', () => {
    expect(() => askUserRegistry.resolve('nope', 'x')).not.toThrow()
  })
})
