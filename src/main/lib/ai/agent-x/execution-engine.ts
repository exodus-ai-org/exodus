import type { AgentMessage } from '@mariozechner/pi-agent-core'
import { agentLoop } from '@mariozechner/pi-agent-core'
import type { Message } from '@mariozechner/pi-ai'
import type { AgentXSseEvent } from '@shared/types/agent-x'

import {
  createTask,
  createTaskExecution,
  createTaskExecutionEvent,
  getAgentById,
  getAllAgents,
  getDepartmentById,
  getTaskById,
  updateTask,
  updateTaskExecution
} from '../../db/agent-x-queries'
import { getSetting } from '../../db/queries'
import type { Agent, Task } from '../../db/schema'
import { getMcpTools, getMcpToolsByNames } from '../mcp'
import {
  getActiveSkillsContent,
  getSkillsContentBySlugs
} from '../skills/skills-manager'
import {
  bindCallingTools,
  getModelFromProvider
} from '../utils/chat-message-util'
import { createDelegateTaskTool } from './agent-tools'

export type SseEmitter = (event: AgentXSseEvent) => void

/**
 * Execute a task by running the assigned agent's loop.
 */
export async function executeTask(
  taskId: string,
  emit: SseEmitter,
  signal?: AbortSignal
): Promise<void> {
  const taskRecord = await getTaskById(taskId)
  if (!taskRecord || !taskRecord.assignedAgentId) {
    throw new Error(`Task ${taskId} not found or has no assigned agent`)
  }

  const agentRecord = await getAgentById(taskRecord.assignedAgentId)
  if (!agentRecord) {
    throw new Error(`Agent ${taskRecord.assignedAgentId} not found`)
  }

  // Mark task as running
  await updateTask(taskId, { status: 'running' })
  emit({ type: 'task_status', taskId, status: 'running' as never })

  // Create execution record
  const execution = await createTaskExecution({
    taskId,
    agentId: agentRecord.id,
    status: 'running',
    error: null,
    tokenUsage: null
  })

  emit({
    type: 'agent_start',
    taskId,
    agentId: agentRecord.id,
    agentName: agentRecord.name
  })

  try {
    const output = await runAgentLoop(
      taskRecord,
      agentRecord,
      execution.id,
      emit,
      signal
    )

    // Mark execution + task completed
    await updateTaskExecution(execution.id, {
      status: 'completed',
      completedAt: new Date()
    })

    await updateTask(taskId, {
      status: 'completed',
      output:
        typeof output === 'string'
          ? { result: output }
          : (output as Record<string, unknown>),
      completedAt: new Date()
    })

    emit({ type: 'task_completed', taskId, output })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    await updateTaskExecution(execution.id, {
      status: 'failed',
      completedAt: new Date(),
      error: errorMsg
    })

    // Retry logic
    const retryCount = (taskRecord.retryCount ?? 0) + 1
    const maxRetries = taskRecord.maxRetries ?? 1
    if (retryCount < maxRetries) {
      await updateTask(taskId, {
        status: 'pending',
        retryCount
      })
      // Retry
      return executeTask(taskId, emit, signal)
    }

    await updateTask(taskId, {
      status: 'failed',
      retryCount
    })
    emit({ type: 'task_failed', taskId, error: errorMsg })
  }
}

async function runAgentLoop(
  taskRecord: Task,
  agentRecord: Agent,
  executionId: string,
  emit: SseEmitter,
  signal?: AbortSignal
): Promise<unknown> {
  const setting = await getSetting()
  const { chatModel, apiKey } = getModelFromProvider(setting)

  // Load department config for skill/MCP scoping (agent may be unassigned)
  const dept = agentRecord.departmentId
    ? await getDepartmentById(agentRecord.departmentId)
    : null
  const deptSkillSlugs = (dept?.skillSlugs as string[] | null) ?? []
  const deptMcpNames = (dept?.mcpServerNames as string[] | null) ?? []

  // Build tools: scope MCP by department's selected servers
  const mcpTools =
    deptMcpNames.length > 0
      ? await getMcpToolsByNames(deptMcpNames)
      : await getMcpTools()
  const allTools = bindCallingTools({
    advancedTools: [],
    setting,
    mcpTools
  })

  // Filter by agent's tool allow list
  const allowList = agentRecord.toolAllowList as string[] | null
  let agentTools =
    allowList && allowList.length > 0
      ? allTools.filter((t) => allowList.includes(t.name))
      : allTools

  // Add delegate + escalate meta-tools
  const allAgents = await getAllAgents()
  const otherAgents = allAgents.filter(
    (a) => a.id !== agentRecord.id && a.isActive
  )

  if (otherAgents.length > 0) {
    const delegateTool = createDelegateTaskTool(
      otherAgents,
      async ({ targetAgentId, taskDescription }) => {
        return handleDelegation(
          taskRecord.id,
          targetAgentId,
          taskDescription,
          emit,
          signal
        )
      }
    )
    agentTools = [...agentTools, delegateTool]
  }

  // Build system prompt with department-scoped skills
  const skillsContent =
    deptSkillSlugs.length > 0
      ? await getSkillsContentBySlugs(deptSkillSlugs)
      : await getActiveSkillsContent()
  const systemContent = buildAgentSystemPrompt(agentRecord) + skillsContent

  // Build user message from task
  const userMessage: Message = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `Task: ${taskRecord.title}\n\n${taskRecord.description ?? ''}\n\n${
          taskRecord.input
            ? `Input data: ${JSON.stringify(taskRecord.input)}`
            : ''
        }`.trim()
      }
    ],
    timestamp: Date.now()
  }

  let finalOutput = ''

  const agentStream = agentLoop(
    [userMessage as AgentMessage],
    {
      systemPrompt: systemContent,
      messages: [],
      tools: agentTools
    },
    {
      model: chatModel,
      apiKey,
      convertToLlm: (agentMessages: AgentMessage[]): Message[] => {
        return agentMessages.filter(
          (m): m is Message =>
            (m as Message).role === 'user' ||
            (m as Message).role === 'assistant' ||
            (m as Message).role === 'toolResult'
        )
      }
    },
    signal
  )

  for await (const event of agentStream) {
    if (event.type === 'message_update') {
      const msg = event.message as Message & { role: 'assistant' }
      const textParts = msg.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('')
      finalOutput = textParts

      emit({
        type: 'message_update',
        taskId: taskRecord.id,
        agentId: agentRecord.id,
        content: textParts
      })

      await createTaskExecutionEvent({
        executionId,
        eventType: 'message_update',
        payload: { content: textParts }
      })
    } else if (event.type === 'tool_execution_start') {
      emit({
        type: 'tool_start',
        taskId: taskRecord.id,
        agentId: agentRecord.id,
        toolName: event.toolName
      })

      await createTaskExecutionEvent({
        executionId,
        eventType: 'tool_start',
        payload: { toolName: event.toolName }
      })
    } else if (event.type === 'tool_execution_end') {
      const result =
        event.result &&
        typeof event.result === 'object' &&
        'details' in event.result
          ? event.result.details
          : event.result

      emit({
        type: 'tool_end',
        taskId: taskRecord.id,
        agentId: agentRecord.id,
        toolName: event.toolName,
        result
      })

      await createTaskExecutionEvent({
        executionId,
        eventType: 'tool_end',
        payload: {
          toolName: event.toolName,
          result: typeof result === 'string' ? result : JSON.stringify(result)
        }
      })
    }
  }

  return finalOutput
}

function buildAgentSystemPrompt(agentRecord: Agent): string {
  const parts: string[] = [`You are "${agentRecord.name}", an AI agent.`]

  if (agentRecord.description) {
    parts.push(`Role: ${agentRecord.description}`)
  }

  if (agentRecord.systemPrompt) {
    parts.push(agentRecord.systemPrompt)
  }

  parts.push(
    '\nYou have access to tools. Use them to accomplish the task.',
    'If you need help from another agent, use the `delegateTask` tool.',
    'If you are blocked and need user input, use the `escalateToUser` tool.',
    'When the task is complete, provide a clear summary of what you accomplished.'
  )

  return parts.join('\n\n')
}

async function handleDelegation(
  parentTaskId: string,
  targetAgentId: string,
  taskDescription: string,
  emit: SseEmitter,
  signal?: AbortSignal
): Promise<string> {
  const childTask = await createTask({
    parentTaskId,
    title: `Delegated: ${taskDescription.slice(0, 80)}`,
    description: taskDescription,
    status: 'pending',
    priority: 'medium',
    assignedAgentId: targetAgentId,
    assignedDepartmentId: null,
    input: null,
    output: null,
    maxRetries: 1,
    retryCount: 0
  })

  emit({
    type: 'delegation_start',
    taskId: parentTaskId,
    childTaskId: childTask.id,
    childAgentId: targetAgentId
  })

  // Execute child task synchronously (nested agent loop)
  await executeTask(childTask.id, emit, signal)

  const completedChild = await getTaskById(childTask.id)
  const result = completedChild?.output
    ? JSON.stringify(completedChild.output)
    : 'Child task completed with no output.'

  emit({
    type: 'delegation_end',
    childTaskId: childTask.id,
    result: completedChild?.output
  })

  return result
}
