import type { ApprovalOutcome, Attempt } from '@exodus/shared/types/chat'
import { fetcher } from '@exodus/shared/utils/http'

import { presenceHeaders } from '@/lib/presence'
import type { Chat } from '@/types/db'

export const updateChat = (payload: Partial<Chat>) =>
  fetcher<void>('/api/v1/chat', { method: 'PUT', body: payload })

export const deleteChat = (id: string) =>
  fetcher<void>(`/api/v1/chat/${id}`, { method: 'DELETE' })

export type ApprovalDecision = 'allow' | 'deny'

/** The user's answer to a paused tool call. Carries the window's presence
 *  token — the API takes this answer from no other local process. */
export const decideApproval = async (payload: {
  runId: string
  toolCallId: string
  decision: ApprovalDecision
}) =>
  fetcher<{ outcome: ApprovalOutcome }>('/api/v1/chat/approval', {
    method: 'POST',
    body: payload,
    headers: await presenceHeaders()
  })

/**
 * Keep one answer of a regenerate group ("Use this one" / "Use this
 * instead"). Answers with the states of the group's runs as stored.
 */
export const chooseAttempt = (chatId: string, runId: string) =>
  fetcher<{ attempts: Record<string, Attempt> }>(
    `/api/v1/chat/${chatId}/choose`,
    { method: 'POST', body: { runId } }
  )
