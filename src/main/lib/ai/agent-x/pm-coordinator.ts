// src/main/lib/ai/agent-x/pm-coordinator.ts
import type { AgentMessage, AgentTool } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import { createTask, getActiveAgents } from '../../db/agent-x-queries'
import {
  addMemberToConversation,
  createConversationMessage,
  getMessagesByConversationId
} from '../../db/conversation-queries'
import { getSettings } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'
import { createEscalateToUserTool } from './agent-tools'
import { askUserRegistry } from './ask-user-registry'
import type { SseEmitter } from './employee-loop'
import { runDelegatedTask } from './execution-engine'
import { createSearchKnowledgeBaseTool } from './kb-tools'
import { createDelegateTaskTool, createRecruitEmployeeTool } from './pm-tools'
import { autoCreateEmployee } from './recruit'

const PM_SYSTEM_PROMPT = `You are the PM (project manager) of a virtual team working in a group chat.
Your job, every round:
1. Understand the user's request.
2. Decide which employees are needed. If an existing employee fits, delegate to them with delegateTask. If nobody fits, recruitEmployee first, then delegate.
3. After each employee returns, REVIEW their output against the goal. If it falls short, delegate again with specific corrections, or recruit/replace. This review-and-correct loop is mandatory — never pass along sub-par work.
4. When everything meets the goal, write ONE final message to the user that summarizes the outcome. Do not call any tool in that final turn.
Use searchKnowledgeBase for company-specific facts before asking the user. Use askUser only when truly blocked.
Delegate to one employee at a time.`

function rosterText(
  agents: { name: string; team: string | null; description: string | null }[]
): string {
  if (agents.length === 0) return '(no employees yet)'
  return agents
    .map(
      (a) =>
        `- ${a.name}${a.team ? ` [${a.team}]` : ''}: ${a.description ?? 'no description'}`
    )
    .join('\n')
}

/**
 * Rebuild PM context from prior conversation messages. The route persists the
 * current user message BEFORE calling us, so without `excludeMessageId` that
 * message would appear in `history` AND be re-supplied as the prompt — making
 * the LLM see the current turn twice on every request.
 */
async function buildHistory(
  conversationId: string,
  excludeMessageId?: string
): Promise<Message[]> {
  const rows = await getMessagesByConversationId(conversationId)
  return rows
    .filter((r) => r.id !== excludeMessageId)
    .map((r) => ({
      role: r.role === 'user' ? 'user' : 'assistant',
      content: [{ type: 'text', text: r.content }],
      timestamp: new Date(r.createdAt).getTime()
    })) as Message[]
}

export interface RunPmArgs {
  conversationId: string
  userText: string
  /** ID of the just-persisted user message; excluded from history so the LLM doesn't see this turn twice. */
  excludeMessageId?: string
  emit: SseEmitter
  signal?: AbortSignal
}

export async function runPmCoordinator(args: RunPmArgs): Promise<void> {
  const { conversationId, userText, excludeMessageId, emit, signal } = args
  const setting = await getSettings()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  const employees = await getActiveAgents()
  const history = await buildHistory(conversationId, excludeMessageId)

  const tools: AgentTool[] = [
    createDelegateTaskTool(
      employees.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description
      })),
      async ({ employeeId, instructions }) => {
        const childTask = await createTask({
          conversationId,
          title: `Delegated: ${instructions.slice(0, 80)}`,
          description: instructions,
          status: 'pending',
          priority: 'medium',
          assignedAgentId: employeeId,
          input: null,
          output: null,
          maxRetries: 1,
          retryCount: 0
        })
        const output = await runDelegatedTask({
          taskId: childTask.id,
          agentId: employeeId,
          conversationId,
          instructions,
          emit,
          signal
        })
        // Persist the employee's final output as a chat bubble.
        await createConversationMessage({
          conversationId,
          role: 'employee',
          agentId: employeeId,
          content: output,
          taskId: childTask.id
        })
        return output
      }
    ),
    createRecruitEmployeeTool(async ({ role, skills, name }) => {
      const emp = await autoCreateEmployee({ role, skills, name })
      await addMemberToConversation(conversationId, emp.id)
      emit({ type: 'member_joined', conversationId, agentId: emp.id })
      return { id: emp.id, name: emp.name }
    }),
    createSearchKnowledgeBaseTool(),
    createEscalateToUserTool(async ({ question, options }) => {
      emit({ type: 'ask_user', conversationId, question, options })
      return askUserRegistry.wait(conversationId)
    })
  ]

  const userMessage: Message = {
    role: 'user',
    content: [{ type: 'text', text: userText }],
    timestamp: Date.now()
  }

  const messageId = uuidV4()
  emit({ type: 'message_start', conversationId, messageId, role: 'pm' })

  let finalText = ''
  try {
    const stream = agentLoop(
      [userMessage as AgentMessage],
      {
        systemPrompt:
          PM_SYSTEM_PROMPT + `\n\nEmployees:\n${rosterText(employees)}`,
        messages: history as AgentMessage[],
        tools
      },
      {
        model: chatModel,
        apiKey,
        convertToLlm: (msgs: AgentMessage[]): Message[] =>
          msgs.filter(
            (m): m is Message =>
              (m as Message).role === 'user' ||
              (m as Message).role === 'assistant' ||
              (m as Message).role === 'toolResult'
          )
      },
      signal
    )

    for await (const event of stream) {
      if (event.type === 'message_update') {
        const msg = event.message as Message
        if (msg.role !== 'assistant') continue
        finalText = msg.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('')
        emit({
          type: 'message_delta',
          conversationId,
          messageId,
          delta: finalText
        })
      } else if (event.type === 'message_end') {
        const msg = event.message as Message & { role: 'assistant' }
        if (msg.role === 'assistant') {
          if (msg.stopReason === 'error') {
            throw new Error(
              msg.errorMessage ||
                'The PM model returned an error without details.'
            )
          }
          // Capture final text from message_end content if not already set via streaming
          const endText = msg.content
            .filter(
              (c): c is { type: 'text'; text: string } => c.type === 'text'
            )
            .map((c) => c.text)
            .join('')
          if (endText) finalText = endText
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emit({ type: 'conversation_error', conversationId, error: message })
    await createConversationMessage({
      conversationId,
      role: 'system',
      content: `⚠️ PM error: ${message}`
    })
    emit({ type: 'message_end', conversationId, messageId })
    return
  }

  await createConversationMessage({
    conversationId,
    role: 'pm',
    content: finalText
  })
  emit({ type: 'message_end', conversationId, messageId })
}
