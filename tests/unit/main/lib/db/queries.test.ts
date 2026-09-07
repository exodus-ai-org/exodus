import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()

vi.mock('@main/lib/db/db', () => ({
  db: { select: mockSelect },
  pglite: {}
}))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const { orderByIds, escapeLikePattern, fullTextSearchOnMessages } =
  await import('@main/lib/db/queries')

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

describe('escapeLikePattern', () => {
  it('escapes the LIKE wildcard characters % and _', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%')
    expect(escapeLikePattern('a_b')).toBe('a\\_b')
    expect(escapeLikePattern('100%_off')).toBe('100\\%\\_off')
  })

  it('escapes a literal backslash before escaping % and _ (order matters)', () => {
    // If '\' were escaped after '%'/'_', a literal '\%' in the input would
    // become double-escaped and no longer match literally.
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
    expect(escapeLikePattern('50\\%')).toBe('50\\\\\\%')
  })

  it('leaves ordinary text (including CJK) unchanged', () => {
    expect(escapeLikePattern('北京烤鸭')).toBe('北京烤鸭')
    expect(escapeLikePattern('hello world')).toBe('hello world')
  })
})

describe('fullTextSearchOnMessages', () => {
  beforeEach(() => {
    mockSelect.mockReset()
  })

  it('returns an empty array for an empty query without touching the database', async () => {
    const result = await fullTextSearchOnMessages('')
    expect(result).toEqual([])
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns an empty array for a whitespace-only query without touching the database', async () => {
    const result = await fullTextSearchOnMessages('   ')
    expect(result).toEqual([])
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('queries the database for a non-empty query', async () => {
    const mockWhere = vi.fn().mockResolvedValue([])
    mockSelect.mockReturnValue({
      from: () => ({ where: mockWhere })
    })

    await fullTextSearchOnMessages('北京烤鸭')

    expect(mockSelect).toHaveBeenCalledTimes(1)
    expect(mockWhere).toHaveBeenCalledTimes(1)
  })
})
