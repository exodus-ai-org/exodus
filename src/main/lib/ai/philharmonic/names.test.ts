// src/main/lib/ai/philharmonic/names.test.ts
import { describe, expect, it } from 'vitest'

import { NAME_POOL, pickName } from './names'

describe('pickName', () => {
  it('returns a name from the pool', () => {
    expect(NAME_POOL).toContain(pickName())
  })

  it('avoids names already taken when possible', () => {
    const taken = NAME_POOL.slice(0, NAME_POOL.length - 1)
    expect(pickName(taken)).toBe(NAME_POOL[NAME_POOL.length - 1])
  })

  it('falls back to a suffixed name when all are taken', () => {
    const name = pickName(NAME_POOL)
    expect(name).toMatch(/\d+$/)
  })
})
