import { atom } from 'jotai'

export const activeAtom = atom<string>('General')

export const settingsDialogVisibleAtom = atom(false)
