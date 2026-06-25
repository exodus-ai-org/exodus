import type { Attachment } from '@shared/types/chat'
import type { PlanDto } from '@shared/types/philharmonic'
import { fetcher } from '@shared/utils/http'

import type {
  ConversationData,
  ConversationMessageData,
  KnowledgeDocData
} from '@/stores/philharmonic'

const BASE = '/api/philharmonic'

export const getConversations = () =>
  fetcher<ConversationData[]>(`${BASE}/conversations`)
export const createConversation = (data: { title: string; icon?: string }) =>
  fetcher<ConversationData>(`${BASE}/conversations`, {
    method: 'POST',
    body: data as never
  })
export const updateConversation = (
  id: string,
  data: Partial<ConversationData>
) =>
  fetcher<ConversationData>(`${BASE}/conversations/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteConversation = (id: string) =>
  fetcher<void>(`${BASE}/conversations/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })
export const getConversationMessages = (id: string) =>
  fetcher<ConversationMessageData[]>(`${BASE}/conversations/${id}/messages`)
export const sendConversationMessage = (
  id: string,
  content: string,
  attachments?: Attachment[]
) =>
  fetcher<ConversationMessageData>(`${BASE}/conversations/${id}/messages`, {
    method: 'POST',
    body: {
      content,
      attachments:
        attachments && attachments.length > 0 ? attachments : undefined
    } as never
  })
export const respondToConversation = (id: string, response: string) =>
  fetcher<{ success: boolean }>(`${BASE}/conversations/${id}/respond`, {
    method: 'POST',
    body: { response } as never
  })

/**
 * Abort the currently-running PM for a conversation. Idempotent — returns
 * wasRunning=false if there was nothing to stop. Fired from the Composer's
 * Stop button while the PM is busy.
 */
export const interruptConversation = (id: string) =>
  fetcher<{ success: boolean; wasRunning: boolean }>(
    `${BASE}/conversations/${id}/interrupt`,
    { method: 'POST', body: {} as never }
  )

/**
 * Pull the active execution plan for a Group. Returns `null` when no plan
 * has been laid out yet. Renderer reads this on mount and on every SSE
 * reconnect so the UI catches up with anything emitted while disconnected.
 */
export const getActivePlan = (conversationId: string) =>
  fetcher<PlanDto | null>(`${BASE}/conversations/${conversationId}/plan`)

export const getKnowledgeDocs = () =>
  fetcher<KnowledgeDocData[]>(`${BASE}/knowledge`)
export const createKnowledgeDoc = (data: {
  title: string
  content: string
  // null = General doc (visible to every Group); omit to default to null
  teamId?: string | null
}) =>
  fetcher<KnowledgeDocData>(`${BASE}/knowledge`, {
    method: 'POST',
    body: data as never
  })
export const updateKnowledgeDoc = (
  id: string,
  data: { title?: string; content?: string; teamId?: string | null }
) =>
  fetcher<KnowledgeDocData>(`${BASE}/knowledge/${id}`, {
    method: 'PUT',
    body: data as never
  })
export const deleteKnowledgeDoc = (id: string) =>
  fetcher<void>(`${BASE}/knowledge/${id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

export interface PhilharmonicCostSummary {
  totalCost: number
  totalTokens: number
  byConversation: Array<{
    conversationId: string
    cost: number
    tokens: number
  }>
  byAgent: Array<{ agentId: string; cost: number; tokens: number }>
  daily: Array<{ date: string; cost: number; tokens: number }>
}
export const getPhilharmonicCosts = () =>
  fetcher<PhilharmonicCostSummary>(`${BASE}/costs`)
