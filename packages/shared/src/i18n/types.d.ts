import type audio from './locales/en/audio.json'
import type chat from './locales/en/chat.json'
import type common from './locales/en/common.json'
import type computerUse from './locales/en/computerUse.json'
import type deepResearch from './locales/en/deepResearch.json'
import type discover from './locales/en/discover.json'
import type errors from './locales/en/errors.json'
import type knowledgeBase from './locales/en/knowledgeBase.json'
import type lock from './locales/en/lock.json'
import type menu from './locales/en/menu.json'
import type philharmonic from './locales/en/philharmonic.json'
import type settings from './locales/en/settings.json'
import type webSearch from './locales/en/webSearch.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      chat: typeof chat
      settings: typeof settings
      philharmonic: typeof philharmonic
      discover: typeof discover
      knowledgeBase: typeof knowledgeBase
      deepResearch: typeof deepResearch
      computerUse: typeof computerUse
      lock: typeof lock
      webSearch: typeof webSearch
      audio: typeof audio
      errors: typeof errors
      menu: typeof menu
    }
  }
}
