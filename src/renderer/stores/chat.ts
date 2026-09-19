import type { EffortLevel } from '@exodus/shared/schemas/settings-schema'
import { AdvancedTools } from '@exodus/shared/types/ai'
import { Attachment, ChatTab } from '@exodus/shared/types/chat'
import { WebSearchResult } from '@exodus/shared/types/web-search'
import { atom } from 'jotai'

import { Chat, DeepResearchMessage } from '@/types/db'

export type { ChatTab }
export const openTabsAtom = atom<ChatTab[]>([])

export const isFullTextSearchVisibleAtom = atom(false)

export const toBeDeletedChatAtom = atom<Chat | undefined>(undefined)

export const activeDeepResearchIdAtom = atom('')

export const deepResearchMessagesAtom = atom<DeepResearchMessage[] | undefined>(
  undefined
)

export const renamedChatTitleAtom = atom({
  id: '',
  title: '',
  open: false
})

export const attachmentAtom = atom<Attachment[] | undefined>(undefined)

export const advancedToolsAtom = atom<AdvancedTools[]>([])

export const reasoningEffortAtom = atom<EffortLevel>('off')

export const sourcesPanelAtom = atom<{
  webSearchResults: WebSearchResult[]
  messageText: string
} | null>(null)
