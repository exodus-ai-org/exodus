import { SettingsSchema } from '@shared/schemas/settings-schema'
import { describe, expect, it } from 'vitest'

const base = { id: 'global', createdAt: new Date(), updatedAt: new Date() }

describe('SettingsSchema.language', () => {
  it("accepts 'auto' and every locale id", () => {
    expect(SettingsSchema.parse({ ...base, language: 'auto' }).language).toBe(
      'auto'
    )
    expect(
      SettingsSchema.parse({ ...base, language: 'zh-Hant-HK' }).language
    ).toBe('zh-Hant-HK')
  })
  it('accepts null/undefined (pre-migration rows)', () => {
    expect(SettingsSchema.parse({ ...base }).language).toBeUndefined()
    expect(
      SettingsSchema.parse({ ...base, language: null }).language
    ).toBeNull()
  })
  it('rejects an unknown value', () => {
    expect(() => SettingsSchema.parse({ ...base, language: 'zh-CN' })).toThrow()
  })
})
