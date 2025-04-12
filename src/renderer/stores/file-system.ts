import { DirectoryNode } from '@shared/types/fs'
import { atom } from 'jotai'

export const localFileAtom = atom<DirectoryNode[] | null>(null)

export const selectedFileAtom = atom('')
