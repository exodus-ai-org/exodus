import type { ChatStatus } from '@exodus/shared/types/chat'
import { atom } from 'jotai'

export const chatInputAtom = atom('')
/**
 * A request for the composer to take focus (caret at the end): bump it after
 * writing `chatInputAtom` from outside the composer — "This is wrong" in the
 * used-memories popover. A counter, so the same request twice still fires.
 */
export const chatInputFocusAtom = atom(0)
export const chatStatusAtom = atom<ChatStatus>('idle')
export const chatStopFnAtom = atom<(() => void) | null>(null)
