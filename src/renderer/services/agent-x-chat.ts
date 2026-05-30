import { fetcher } from '@shared/utils/http'

import type {
  ConversationData,
  ConversationMessageData,
  KnowledgeDocData
} from '@/stores/agent-x'

const BASE = '/api/agent-x'

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
export const getConversationMessages = (id: string) =>
  fetcher<ConversationMessageData[]>(`${BASE}/conversations/${id}/messages`)
export const sendConversationMessage = (id: string, content: string) =>
  fetcher<ConversationMessageData>(`${BASE}/conversations/${id}/messages`, {
    method: 'POST',
    body: { content } as never
  })
export const respondToConversation = (id: string, response: string) =>
  fetcher<{ success: boolean }>(`${BASE}/conversations/${id}/respond`, {
    method: 'POST',
    body: { response } as never
  })

export const getKnowledgeDocs = () =>
  fetcher<KnowledgeDocData[]>(`${BASE}/knowledge`)
export const createKnowledgeDoc = (data: { title: string; content: string }) =>
  fetcher<KnowledgeDocData>(`${BASE}/knowledge`, {
    method: 'POST',
    body: data as never
  })
export const updateKnowledgeDoc = (
  id: string,
  data: { title?: string; content?: string }
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

export interface AgentXCostSummary {
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
export const getAgentXCosts = () => fetcher<AgentXCostSummary>(`${BASE}/costs`)
