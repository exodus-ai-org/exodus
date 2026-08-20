import { pmRunRegistry } from '@main/lib/ai/philharmonic/pm-run-registry'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(() => {
  // Make tests independent — nothing leaks between cases.
  pmRunRegistry.clear('c1')
  pmRunRegistry.clear('c2')
})

describe('pmRunRegistry', () => {
  it('reports has=false and abort=false when nothing is registered', () => {
    expect(pmRunRegistry.has('c1')).toBe(false)
    expect(pmRunRegistry.abort('c1')).toBe(false)
  })

  it('aborts the registered controller and clears the slot', () => {
    const c = new AbortController()
    pmRunRegistry.set('c1', c)
    expect(pmRunRegistry.has('c1')).toBe(true)
    expect(pmRunRegistry.abort('c1')).toBe(true)
    expect(c.signal.aborted).toBe(true)
    // After abort the slot can still hold the signaled controller until the
    // route clears it; downstream code uses signal.aborted not has().
    pmRunRegistry.clear('c1')
    expect(pmRunRegistry.has('c1')).toBe(false)
  })

  it('replaces an older controller when a newer one is registered', () => {
    const a = new AbortController()
    const b = new AbortController()
    pmRunRegistry.set('c1', a)
    pmRunRegistry.set('c1', b)
    pmRunRegistry.abort('c1')
    expect(a.signal.aborted).toBe(false)
    expect(b.signal.aborted).toBe(true)
  })

  it('isolates conversations', () => {
    const a = new AbortController()
    const b = new AbortController()
    pmRunRegistry.set('c1', a)
    pmRunRegistry.set('c2', b)
    pmRunRegistry.abort('c1')
    expect(a.signal.aborted).toBe(true)
    expect(b.signal.aborted).toBe(false)
  })
})
