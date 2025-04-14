import { Attachment } from 'ai'
import { atom } from 'jotai'

export const isArtifactVisibleAtom = atom(false)

export const attachmentAtom = atom<Attachment[] | undefined>(undefined)
