import { Attachment } from 'ai'
import { atom } from 'jotai'

export const showArtifactSheetAtom = atom(false)

export const attachmentAtom = atom<Attachment[] | undefined>(undefined)
