export const LOCALE_IDS = [
  'en',
  'zh-Hant-TW',
  'zh-Hant-HK',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'pt-BR',
  'it'
] as const
export type LocaleId = (typeof LOCALE_IDS)[number]

export type LanguageSetting = LocaleId | 'auto'
export const DEFAULT_LANGUAGE_SETTING: LanguageSetting = 'auto'

export const LOCALES: Record<
  LocaleId,
  { id: LocaleId; nativeName: string; englishName: string; flag: string }
> = {
  en: {
    id: 'en',
    nativeName: 'English',
    englishName: 'English',
    flag: '🇺🇸'
  },
  'zh-Hant-TW': {
    id: 'zh-Hant-TW',
    nativeName: '繁體中文（台灣）',
    englishName: 'Chinese (Traditional, Taiwan)',
    flag: '🇹🇼'
  },
  'zh-Hant-HK': {
    id: 'zh-Hant-HK',
    nativeName: '繁體中文（香港）',
    englishName: 'Chinese (Traditional, Hong Kong)',
    flag: '🇭🇰'
  },
  ja: { id: 'ja', nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵' },
  ko: { id: 'ko', nativeName: '한국어', englishName: 'Korean', flag: '🇰🇷' },
  fr: {
    id: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    flag: '🇫🇷'
  },
  de: { id: 'de', nativeName: 'Deutsch', englishName: 'German', flag: '🇩🇪' },
  es: {
    id: 'es',
    nativeName: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸'
  },
  'pt-BR': {
    id: 'pt-BR',
    nativeName: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    flag: '🇧🇷'
  },
  it: {
    id: 'it',
    nativeName: 'Italiano',
    englishName: 'Italian',
    flag: '🇮🇹'
  }
}

export const FALLBACK_LNG = {
  'zh-Hant-HK': ['zh-Hant-TW', 'en'],
  default: ['en']
} as const

export function isLocaleId(v: unknown): v is LocaleId {
  return typeof v === 'string' && (LOCALE_IDS as readonly string[]).includes(v)
}

/** Normalise BCP-47 casing: "zh-hant-hk" -> "zh-Hant-HK", "PT-br" -> "pt-BR". */
function canon(tag: string): string {
  const parts = tag.split(/[-_]/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts
    .map((p, i) => {
      if (i === 0) return p.toLowerCase()
      if (p.length === 4) return p[0].toUpperCase() + p.slice(1).toLowerCase()
      if (p.length === 2) return p.toUpperCase()
      return p.toLowerCase()
    })
    .join('-')
}

export function resolveLocale(prefs: string[]): LocaleId {
  for (const raw of prefs) {
    const tag = canon(raw)
    if (!tag) continue
    const [lang, ...rest] = tag.split('-')

    if ((LOCALE_IDS as readonly string[]).includes(tag)) return tag as LocaleId

    if (lang === 'zh') {
      if (rest.includes('Hans')) {
        continue // zh-Hans* must fall through to en
      }
      const region = rest.find((p) => p.length === 2)
      if (rest.includes('Hant') || region === 'TW' || region === 'HK') {
        return region === 'HK' ? 'zh-Hant-HK' : 'zh-Hant-TW'
      }
      continue // zh, zh-CN -> fall through to en
    }

    if (lang === 'pt') return 'pt-BR'

    const base = LOCALE_IDS.find(
      (id) => id === lang || id.startsWith(`${lang}-`)
    )
    if (base) return base
  }
  return 'en'
}
