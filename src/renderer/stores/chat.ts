import { AdvancedTools } from '@shared/types/ai'
import { DeepResearchMessage } from '@shared/types/db'
import { Attachment } from 'ai'
import { atom } from 'jotai'

export const isArtifactVisibleAtom = atom(false)

export const isFullTextSearchVisibleAtom = atom(false)

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

export const advancedToolsAtom = atom<AdvancedTools[]>([
  AdvancedTools.WebSearch
])

export const availableMcpToolsAtom = atom([])
