import { AdvancedTools } from '@shared/types/ai'
import { Attachment } from 'ai'
import { atom } from 'jotai'

export const isArtifactVisibleAtom = atom(false)

export const attachmentAtom = atom<Attachment[] | undefined>(undefined)

export const advancedToolsAtom = atom<AdvancedTools[]>([])

export const availableMcpToolsAtom = atom([])
