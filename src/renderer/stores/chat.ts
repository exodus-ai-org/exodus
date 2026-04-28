import { AdvancedTools } from '@shared/types/ai'
import { Attachment, ChatTab } from '@shared/types/chat'
import { Chat, DeepResearchMessage } from '@shared/types/db'
import { WebSearchResult } from '@shared/types/web-search'
import { atom } from 'jotai'

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

export const sourcesPanelAtom = atom<{
  webSearchResults: WebSearchResult[]
  messageText: string
} | null>(null)
