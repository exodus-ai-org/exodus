import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPreferredSystemLanguages: () => ['fr-CA', 'en-US'],
    getPath: () => '/tmp'
  },
  ipcMain: { on: vi.fn(), handle: vi.fn() }
}))
vi.mock('@main/lib/db/queries', () => ({ getSettings: vi.fn() }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const { resolveEffectiveLocale } = await import('@main/lib/i18n')

describe('resolveEffectiveLocale', () => {
  it("'auto' resolves from the OS languages", () => {
    expect(resolveEffectiveLocale('auto')).toBe('fr')
  })
  it('an explicit id is used as-is', () => {
    expect(resolveEffectiveLocale('zh-Hant-TW')).toBe('zh-Hant-TW')
  })
  it('null falls back to auto-resolution', () => {
    expect(resolveEffectiveLocale(null)).toBe('fr')
  })
  it('garbage falls back to auto-resolution', () => {
    expect(resolveEffectiveLocale('nonsense' as never)).toBe('fr')
  })
})
