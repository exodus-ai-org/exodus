import type { ChatStatus } from '@exodus/shared/types/chat'
import { atom } from 'jotai'

export const chatInputAtom = atom('')
export const chatStatusAtom = atom<ChatStatus>('idle')
export const chatStopFnAtom = atom<(() => void) | null>(null)
