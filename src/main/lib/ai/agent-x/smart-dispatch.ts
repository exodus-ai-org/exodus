import { completeSimple } from '@mariozechner/pi-ai'
import type { AgentXSseEvent } from '@shared/types/agent-x'

import {
  createAgent,
  deleteAgent,
  getAgentById,
  isAgentBusy,
  updateTask
} from '../../db/agent-x-queries'
import { getSetting } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'
import { autoRouteTask } from './auto-router'
import { executeTask } from './execution-engine'

export type SseEmitter = (event: AgentXSseEvent) => void

const AUTO_CREATE_PROMPT = `You are designing a new AI agent for a multi-agent system. Given a task description, produce a JSON agent specification.

Respond with ONLY a JSON object (no markdown):
{"name":"...","description":"...","systemPrompt":"..."}`

/**
 * Smart dispatch: auto-route → check availability → shadow/queue/create agent as needed.
 */
export async function smartDispatch(
  taskId: string,
  taskTitle: string,
  taskDescription: string | null,
  taskPriority: string,
  assignedAgentId: string | null,
  isCronChild: boolean,
  emit: SseEmitter,
  signal?: AbortSignal
): Promise<void> {
  let agentId = assignedAgentId

  // 1. Auto-route if no agent explicitly assigned
  if (!agentId) {
    const routeResult = await autoRouteTask(
      [taskTitle, taskDescription].filter(Boolean).join('\n')
    )

    if (routeResult && routeResult.confidence >= 0.3) {
      agentId = routeResult.agentId
      await updateTask(taskId, {
        assignedAgentId: agentId,
        assignedDepartmentId: routeResult.departmentId || null
      })
    } else {
      // Auto-create an agent if the skills/agents on hand can't handle it
      const newAgent = await autoCreateAgent(
        taskTitle,
        taskDescription,
        routeResult?.departmentId ?? null
      )
      agentId = newAgent.id
      await updateTask(taskId, { assignedAgentId: agentId })
      emit({ type: 'agent_created', taskId, agentId, agentName: newAgent.name })
    }
  }

  // 2. Check if the target agent is busy
  const busy = await isAgentBusy(agentId)

  if (!busy) {
    await executeTask(taskId, emit, signal)
    return
  }

  // 3. Agent is busy — decide based on priority & task type
  const isHighPriority = taskPriority === 'high' || taskPriority === 'urgent'

  if (isCronChild) {
    // TODO: Shadow agent for cron tasks — design pending (skip shadow, just queue)
    emit({ type: 'task_queued', taskId, reason: 'cron_no_shadow' })
    return
  }

  if (isHighPriority) {
    // Clone the busy agent as a temporary shadow, run task on shadow, then delete
    const originalAgent = await getAgentById(agentId)
    if (!originalAgent) {
      emit({ type: 'task_queued', taskId, reason: 'agent_busy' })
      return
    }

    const shadowAgent = await createAgent({
      name: `${originalAgent.name} (shadow)`,
      description: originalAgent.description,
      systemPrompt: originalAgent.systemPrompt,
      departmentId: originalAgent.departmentId,
      toolAllowList: originalAgent.toolAllowList as string[],
      skillSlugs: originalAgent.skillSlugs as string[],
      mcpServerNames: originalAgent.mcpServerNames as string[],
      model: originalAgent.model,
      provider: originalAgent.provider,
      collaboratorIds: [],
      isActive: true,
      isShadow: true,
      shadowOfAgentId: originalAgent.id
    })

    await updateTask(taskId, { assignedAgentId: shadowAgent.id })
    emit({
      type: 'shadow_agent_created',
      taskId,
      shadowAgentId: shadowAgent.id,
      originalAgentId: originalAgent.id
    })

    try {
      await executeTask(taskId, emit, signal)
    } finally {
      await deleteAgent(shadowAgent.id)
    }
    return
  }

  // Low/medium priority + agent busy → queue (stay as pending)
  emit({ type: 'task_queued', taskId, reason: 'agent_busy' })
}

async function autoCreateAgent(
  taskTitle: string,
  taskDescription: string | null,
  departmentId: string | null
) {
  const setting = await getSetting()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  const prompt = `Task: ${taskTitle}\n${taskDescription ? `Description: ${taskDescription}` : ''}`

  let name = taskTitle.slice(0, 40)
  let description = `Auto-created agent for: ${taskTitle}`
  let systemPrompt = `You are an AI agent. Your job: ${taskTitle}.`

  try {
    const result = await completeSimple(
      chatModel,
      {
        systemPrompt: AUTO_CREATE_PROMPT,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey }
    )

    const text = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')

    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const spec = JSON.parse(match[0]) as {
        name: string
        description: string
        systemPrompt: string
      }
      name = spec.name || name
      description = spec.description || description
      systemPrompt = spec.systemPrompt || systemPrompt
    }
  } catch {
    // Fall back to defaults above
  }

  return createAgent({
    name,
    description,
    systemPrompt,
    departmentId,
    toolAllowList: [],
    skillSlugs: [],
    mcpServerNames: [],
    collaboratorIds: [],
    isActive: true,
    isShadow: false
  })
}
