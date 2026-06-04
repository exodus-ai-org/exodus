import { atom } from 'jotai'

export const activeConversationIdAtom = atom<string | null>(null)
// In-flight streaming bubbles keyed by messageId (server messageId).
export const streamingBubblesAtom = atom<
  Record<
    string,
    { role: string; agentId?: string; text: string; done: boolean }
  >
>({})
