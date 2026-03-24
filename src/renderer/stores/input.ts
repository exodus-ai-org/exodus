import { atom } from 'jotai'

import type { ChatStatus } from '@/hooks/use-chat'

export const chatInputAtom = atom('')
export const chatStatusAtom = atom<ChatStatus>('idle')
export const chatStopFnAtom = atom<(() => void) | null>(null)
