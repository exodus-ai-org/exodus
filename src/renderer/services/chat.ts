import type { ApprovalOutcome } from '@exodus/shared/types/chat'
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
