import { atom } from 'jotai'
import { DirectoryNode } from 'src/main/lib/ipc/file-system'

export const localFileAtom = atom<DirectoryNode[] | null>(null)

export const selectedFileAtom = atom('')
