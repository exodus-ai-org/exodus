import { atom } from 'jotai'

export const settingLabelAtom = atom<string>('General')

export const isSettingVisibleAtom = atom(false)

export const isMcpServerChangedAtom = atom(false)
