import type { EffortLevel } from '@exodus/shared/schemas/settings-schema'
import { AdvancedTools } from '@exodus/shared/types/ai'
import { Attachment, ChatMessage } from '@exodus/shared/types/chat'
import { WebSearchResult } from '@exodus/shared/types/web-search'
import { atom } from 'jotai'

import { Chat, DeepResearchMessage } from '@/types/db'

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

/**
 * The open chat's messages, for the header and its panel (`chat/header`,
 * `chat/panel`): `<Chat>` sets them when a message is added or the stream
 * settles — not on every streaming frame — and clears them on unmount.
 */
export const chatMessagesAtom = atom<ChatMessage[]>([])

/**
 * A tool call id: the artifact card with it opens full screen (the panel's
 * Files list clicked it), then clears it.
 */
export const revealArtifactAtom = atom<string | null>(null)

export const sourcesPanelAtom = atom<{
  webSearchResults: WebSearchResult[]
  messageText: string
} | null>(null)
