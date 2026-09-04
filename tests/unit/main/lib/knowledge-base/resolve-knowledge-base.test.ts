import type { Settings } from '@main/lib/db/schema'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const { resolveKnowledgeBase } =
  await import('@main/lib/knowledge-base/resolve-knowledge-base')

const base = { id: 'global' } as Settings
const withUrl = (url: string, apiKey?: string) =>
  ({ ...base, knowledgeBase: { url, apiKey } }) as Settings

describe('resolveKnowledgeBase', () => {
  it('returns null when unconfigured', () => {
    expect(resolveKnowledgeBase(base)).toBeNull()
  })

  it('returns null when url is empty', () => {
    expect(resolveKnowledgeBase(withUrl(''))).toBeNull()
  })

  it('returns null (not throw) on a malformed url', () => {
    expect(resolveKnowledgeBase(withUrl('localhost:9621'))).toBeNull()
  })

  it('returns a client when url is set', () => {
    expect(
      resolveKnowledgeBase(withUrl('http://localhost:9621'))
    ).not.toBeNull()
  })

  it('caches by url+apiKey', () => {
    const a = resolveKnowledgeBase(withUrl('http://h:9621', 'k1'))
    const b = resolveKnowledgeBase(withUrl('http://h:9621', 'k1'))
    const c = resolveKnowledgeBase(withUrl('http://h:9621', 'k2'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
