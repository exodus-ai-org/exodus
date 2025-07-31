import { atom } from 'jotai'

export const settingsLabelAtom = atom<string>('General')

export const isSettingsVisibleAtom = atom(false)

export const isMcpServerChangedAtom = atom(false)
