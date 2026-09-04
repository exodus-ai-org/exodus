import type { Settings } from '@main/lib/db/schema'
import { describe, expect, it, vi } from 'vitest'

// Mock the modules that transitively import Electron/DB — pglite-search.ts
// and elasticsearch-search.ts both pull in `db/queries.ts`, which pulls in
// `db/db.ts` (real PGlite instantiation) and `logger.ts` (@electron-toolkit/utils).
vi.mock('@main/lib/db/db', () => ({ pglite: {} }))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const { resolveSearchProvider } =
  await import('@main/lib/search/resolve-search-provider')

const baseSettings = { id: 'global' } as Settings

describe('resolveSearchProvider', () => {
  it('returns no elasticsearch provider when unconfigured', () => {
    const { elasticsearch, pglite } = resolveSearchProvider(baseSettings)
    expect(elasticsearch).toBeNull()
    expect(pglite).toBeDefined()
  })

  it('returns no elasticsearch provider when url is empty', () => {
    const settings = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url: '' } }
    } as Settings
    const { elasticsearch } = resolveSearchProvider(settings)
    expect(elasticsearch).toBeNull()
  })

  it('returns an elasticsearch provider when url is set', () => {
    const settings = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url: 'http://localhost:9200' } }
    } as Settings
    const { elasticsearch } = resolveSearchProvider(settings)
    expect(elasticsearch).not.toBeNull()
  })

  // The Elasticsearch Client constructor throws synchronously on a malformed
  // node URL. `resolveSearchProvider` runs on unguarded hot paths (notably
  // the `index-message` job handler enqueued from `POST /api/chat`), so it
  // must swallow that and degrade to PGlite rather than take the whole
  // request down.
  it.each([
    ['a scheme-less host:port', 'localhost:9200'],
    ['an unparseable url', 'not a url']
  ])('falls back to PGlite for %s', (_label, url) => {
    const settings = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url } }
    } as Settings

    let resolved: ReturnType<typeof resolveSearchProvider> | undefined
    expect(() => {
      resolved = resolveSearchProvider(settings)
    }).not.toThrow()

    expect(resolved!.elasticsearch).toBeNull()
    expect(resolved!.pglite).toBeDefined()
  })

  // Cache tests use their own unique URLs so module-level cache state from
  // other tests in this file can't leak in and produce a false pass.
  it('reuses the same provider instance for an unchanged config', () => {
    const settings = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url: 'http://cache-test-1:9200' } }
    } as Settings
    const first = resolveSearchProvider(settings).elasticsearch
    const second = resolveSearchProvider(settings).elasticsearch
    expect(first).toBe(second)
  })

  it('creates a new provider instance when the config changes', () => {
    const settingsA = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url: 'http://cache-test-2a:9200' } }
    } as Settings
    const settingsB = {
      ...baseSettings,
      fullTextSearch: { elasticsearch: { url: 'http://cache-test-2b:9200' } }
    } as Settings
    const a = resolveSearchProvider(settingsA).elasticsearch
    const b = resolveSearchProvider(settingsB).elasticsearch
    expect(a).not.toBe(b)
  })
})
