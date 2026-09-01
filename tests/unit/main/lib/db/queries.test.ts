import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/db', () => ({ db: {}, pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const { orderByIds } = await import('@main/lib/db/queries')

describe('orderByIds', () => {
  it('reorders rows to match the given id order', () => {
    const rows = [{ id: 'b' }, { id: 'a' }, { id: 'c' }]
    expect(orderByIds(rows, ['a', 'b', 'c'])).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ])
  })

  it('preserves relevance order from an external ranking (e.g. Elasticsearch)', () => {
    const rows = [{ id: 'x' }, { id: 'y' }, { id: 'z' }]
    // Simulate ES returning 'z' as most relevant, then 'x', then 'y'.
    expect(orderByIds(rows, ['z', 'x', 'y'])).toEqual([
      { id: 'z' },
      { id: 'x' },
      { id: 'y' }
    ])
  })

  it('does not mutate the input array', () => {
    const rows = [{ id: 'b' }, { id: 'a' }]
    const original = [...rows]
    orderByIds(rows, ['a', 'b'])
    expect(rows).toEqual(original)
  })

  it('handles an empty ids array without throwing', () => {
    const rows = [{ id: 'a' }, { id: 'b' }]
    expect(() => orderByIds(rows, [])).not.toThrow()
  })
})
