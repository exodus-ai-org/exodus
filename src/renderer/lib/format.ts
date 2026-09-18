import type { LocaleId } from '@shared/i18n/locales'
import { formatDistanceToNow } from 'date-fns'
import {
  de,
  enUS,
  es,
  fr,
  it,
  ja,
  ko,
  ptBR,
  zhHK,
  zhTW,
  type Locale
} from 'date-fns/locale'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const DATE_FNS: Record<LocaleId, Locale> = {
  en: enUS,
  'zh-Hant-TW': zhTW,
  'zh-Hant-HK': zhHK,
  ja,
  ko,
  fr,
  de,
  es,
  'pt-BR': ptBR,
  it
}

export function makeFormatters(localeId: string) {
  const dfLocale = DATE_FNS[localeId as LocaleId] ?? enUS
  const intlTag = DATE_FNS[localeId as LocaleId] ? localeId : 'en'
  return {
    relativeTime: (d: Date) =>
      formatDistanceToNow(d, { addSuffix: true, locale: dfLocale }),
    dateTime: (d: Date, o?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(intlTag, o).format(d),
    number: (n: number, o?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlTag, o).format(n)
  }
}

export function useFormat() {
  const { i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  return useMemo(() => makeFormatters(lng), [lng])
}
