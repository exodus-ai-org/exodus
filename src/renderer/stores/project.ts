import { atom } from 'jotai'

export type SidebarTab = 'chats' | 'projects'
export const sidebarTabAtom = atom<SidebarTab>('chats')

export const activeProjectIdAtom = atom<string | undefined>(undefined)
