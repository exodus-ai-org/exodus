import { BASE_URL } from '@shared/constants/systems'
import type {
  PhilharmonicSseEvent,
  PlanDto,
  StepDto,
  StepPatch
} from '@shared/types/philharmonic'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'

import { getActivePlan } from '@/services/philharmonic-chat'

export interface LiveBubble {
  messageId: string
  role: string
  agentId?: string
  text: string
  done: boolean
  toolCards: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
}

export interface RetryNotice {
  /** monotonic id so callers can deduplicate */
  id: number
  taskId: string
  attempt: number
  delayMs: number
  error: string
}

export interface ConversationStream {
  bubbles: LiveBubble[]
  askUser: { question: string; options: string[] } | null
  error: string | null
  /** bumps whenever a message_end / member_joined arrives so the page can refetch */
  revision: number
  /** Current execution plan, or null if none yet. Live-updated from SSE. */
  plan: PlanDto | null
  /** Most recent retry notification (used for inline UI hints / logs). */
  lastRetry: RetryNotice | null
  /** True while the PM is actively driving a turn — drives the Stop button. */
  pmRunning: boolean
}

function applyStepPatch(step: StepDto, patch: StepPatch): StepDto {
  return {
    ...step,
    ...patch,
    output: patch.output !== undefined ? patch.output : step.output,
    note: patch.note !== undefined ? patch.note : step.note,
    assignedAgentId:
      patch.assignedAgentId !== undefined
        ? patch.assignedAgentId
        : step.assignedAgentId
  }
}

export function useConversationStream(
  conversationId: string | null
): ConversationStream {
  const [bubbles, setBubbles] = useState<LiveBubble[]>([])
  const [askUser, setAskUser] = useState<ConversationStream['askUser']>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [plan, setPlan] = useState<PlanDto | null>(null)
  const [lastRetry, setLastRetry] = useState<RetryNotice | null>(null)
  const retryCounter = useRef(0)
  const [pmRunning, setPmRunning] = useState(false)

  // Pull the current plan on mount / conversation switch so users coming back
  // to a Group after closing the panel see the latest state. SSE events
  // continue to mutate `plan` from here on.
  useEffect(() => {
    if (!conversationId) {
      setPlan(null)
      return
    }
    let cancelled = false
    getActivePlan(conversationId)
      .then((p) => {
        if (!cancelled) setPlan(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    setBubbles([])
    setAskUser(null)
    setError(null)
    setPmRunning(false)

    const source = new EventSource(
      `${BASE_URL}/api/philharmonic/conversations/${conversationId}/sse`
    )
    source.onmessage = (e) => {
      let evt: PhilharmonicSseEvent
      try {
        evt = JSON.parse(e.data) as PhilharmonicSseEvent
      } catch {
        return
      }
      if (!('conversationId' in evt) || evt.conversationId !== conversationId)
        return

      switch (evt.type) {
        case 'message_start':
          setBubbles((prev) => [
            ...prev,
            {
              messageId: evt.messageId,
              role: evt.role,
              agentId: evt.agentId,
              text: '',
              done: false,
              toolCards: []
            }
          ])
          // PM resuming after an askUser response → clear the panel.
          setAskUser(null)
          break
        case 'message_delta':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, text: evt.delta } : b
            )
          )
          break
        case 'message_end':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, done: true } : b
            )
          )
          setRevision((r) => r + 1)
          break
        case 'tool_card':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId
                ? {
                    ...b,
                    toolCards: [
                      ...b.toolCards,
                      {
                        toolName: evt.toolName,
                        phase: evt.phase,
                        result: evt.result
                      }
                    ]
                  }
                : b
            )
          )
          break
        case 'member_joined':
          setRevision((r) => r + 1)
          break
        case 'ask_user':
          setAskUser({ question: evt.question, options: evt.options })
          break
        case 'conversation_error':
          setError(evt.error)
          // Bubble to the app shell so users see it even when the panel is
          // closed. The inline error block in GroupChat is still rendered.
          sileo.error({
            title: 'Group encountered an error',
            description:
              evt.error.length > 200 ? `${evt.error.slice(0, 197)}…` : evt.error
          })
          break
        case 'pm_started':
          setPmRunning(true)
          break
        case 'pm_ended':
          setPmRunning(false)
          break
        case 'delegation_retry':
          retryCounter.current += 1
          setLastRetry({
            id: retryCounter.current,
            taskId: evt.taskId,
            attempt: evt.attempt,
            delayMs: evt.delayMs,
            error: evt.error
          })
          break
        case 'plan_created':
          setPlan(evt.plan)
          break
        case 'plan_step_updated':
          setPlan((prev) =>
            prev
              ? {
                  ...prev,
                  steps: prev.steps.map((s) =>
                    s.id === evt.stepId ? applyStepPatch(s, evt.patch) : s
                  )
                }
              : prev
          )
          break
        case 'plan_step_appended':
          setPlan((prev) =>
            prev ? { ...prev, steps: [...prev.steps, evt.step] } : prev
          )
          break
        case 'plan_status_changed':
          setPlan((prev) => (prev ? { ...prev, status: evt.status } : prev))
          break
      }
    }
    return () => source.close()
  }, [conversationId])

  return { bubbles, askUser, error, revision, plan, lastRetry, pmRunning }
}
