import type { AgentXSseEvent } from '@shared/types/agent-x'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'

import { autoFillTask } from '../../ai/agent-x/auto-fill'
import { autoRouteTask } from '../../ai/agent-x/auto-router'
import { executeTask } from '../../ai/agent-x/execution-engine'
import { scheduleTask, unscheduleTask } from '../../ai/agent-x/scheduler'
import { smartDispatch } from '../../ai/agent-x/smart-dispatch'
import { listInstalledSkills } from '../../ai/skills/skills-manager'
import {
  batchUpdatePositions,
  createAgent,
  createDepartment,
  createTask,
  deleteAgent,
  deleteDepartment,
  getAgentById,
  getAllAgents,
  getAllDepartments,
  getAllTasks,
  getChildTasksByParentId,
  getEventsByExecutionId,
  getExecutionsByTaskId,
  getTaskById,
  updateAgent,
  updateDepartment,
  updateTask
} from '../../db/agent-x-queries'
import { ChatSDKError } from '../errors'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const agentX = new Hono<{ Variables: Variables }>()

// ─── SSE Client Management ──────────────────────────────────────────────────

// Map of taskId -> Set of SSE controllers
const taskClients = new Map<string, Set<ReadableStreamDefaultController>>()
// Global SSE clients (receive all task events)
const globalClients = new Set<ReadableStreamDefaultController>()

export function emitToAll(event: AgentXSseEvent) {
  const encoded = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
  for (const controller of globalClients) {
    try {
      controller.enqueue(encoded)
    } catch {
      globalClients.delete(controller)
    }
  }
}

function emitToTask(taskId: string, event: AgentXSseEvent) {
  const encoded = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)

  // Notify task-specific clients
  const clients = taskClients.get(taskId)
  if (clients) {
    for (const controller of clients) {
      try {
        controller.enqueue(encoded)
      } catch {
        clients.delete(controller)
      }
    }
  }

  // Notify global clients
  for (const controller of globalClients) {
    try {
      controller.enqueue(encoded)
    } catch {
      globalClients.delete(controller)
    }
  }
}

// ─── Department CRUD ────────────────────────────────────────────────────────

const departmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  skillSlugs: z.array(z.string()).optional(),
  mcpServerNames: z.array(z.string()).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional().nullable()
})

agentX.get('/departments', async (c) => {
  const departments = await handleDatabaseOperation(
    () => getAllDepartments(),
    'Failed to get departments'
  )
  return successResponse(c, departments)
})

agentX.post('/departments', async (c) => {
  const data = validateSchema(
    departmentSchema,
    await c.req.json(),
    'agent_x',
    'Invalid department data'
  )
  const result = await handleDatabaseOperation(
    () => createDepartment(data),
    'Failed to create department'
  )
  return successResponse(c, result, 201)
})

agentX.put('/departments/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const data = validateSchema(
    departmentSchema.partial(),
    await c.req.json(),
    'agent_x',
    'Invalid department data'
  )
  const result = await handleDatabaseOperation(
    () => updateDepartment(id, data),
    'Failed to update department'
  )
  return successResponse(c, result)
})

agentX.delete('/departments/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  await handleDatabaseOperation(
    () => deleteDepartment(id),
    'Failed to delete department'
  )
  return c.text('Department deleted successfully', 200)
})

// ─── Agent CRUD ─────────────────────────────────────────────────────────────

const agentSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  toolAllowList: z.array(z.string()).optional(),
  skillSlugs: z.array(z.string()).optional(),
  mcpServerNames: z.array(z.string()).optional(),
  collaboratorIds: z.array(z.string()).optional(),
  model: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  position: z.object({ x: z.number(), y: z.number() }).optional().nullable(),
  isActive: z.boolean().optional()
})

agentX.get('/agents', async (c) => {
  const agents = await handleDatabaseOperation(
    () => getAllAgents(),
    'Failed to get agents'
  )
  return successResponse(c, agents)
})

agentX.post('/agents', async (c) => {
  const data = validateSchema(
    agentSchema,
    await c.req.json(),
    'agent_x',
    'Invalid agent data'
  )
  const result = await handleDatabaseOperation(
    () => createAgent(data),
    'Failed to create agent'
  )
  return successResponse(c, result, 201)
})

agentX.put('/agents/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const data = validateSchema(
    agentSchema.partial(),
    await c.req.json(),
    'agent_x',
    'Invalid agent data'
  )
  const result = await handleDatabaseOperation(
    () => updateAgent(id, data),
    'Failed to update agent'
  )
  return successResponse(c, result)
})

agentX.delete('/agents/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  await handleDatabaseOperation(() => deleteAgent(id), 'Failed to delete agent')
  return c.text('Agent deleted successfully', 200)
})

// ─── Task Management ────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedDepartmentId: z.string().uuid().optional().nullable(),
  assignedAgentId: z.string().uuid().optional().nullable(),
  input: z.record(z.string(), z.unknown()).optional().nullable(),
  cronExpression: z.string().optional().nullable()
})

agentX.get('/tasks', async (c) => {
  const tasks = await handleDatabaseOperation(
    () => getAllTasks(),
    'Failed to get tasks'
  )
  return successResponse(c, tasks)
})

agentX.get('/tasks/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const taskRecord = await handleDatabaseOperation(
    () => getTaskById(id),
    'Failed to get task'
  )
  if (!taskRecord) {
    throw new ChatSDKError('not_found:agent_x', 'Task not found')
  }

  // Include executions and events
  const executions = await getExecutionsByTaskId(id)
  const executionsWithEvents = await Promise.all(
    executions.map(async (exec) => ({
      ...exec,
      events: await getEventsByExecutionId(exec.id)
    }))
  )

  return successResponse(c, {
    ...taskRecord,
    executions: executionsWithEvents
  })
})

agentX.get('/tasks/:id/children', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const children = await getChildTasksByParentId(id)

  const childrenWithExecutions = await Promise.all(
    children.map(async (child) => {
      const executions = await getExecutionsByTaskId(child.id)
      const totalTokens = executions.reduce(
        (sum, e) =>
          sum +
          ((
            e.tokenUsage as {
              inputTokens?: number
              outputTokens?: number
            } | null
          )?.inputTokens ?? 0) +
          ((
            e.tokenUsage as {
              inputTokens?: number
              outputTokens?: number
            } | null
          )?.outputTokens ?? 0),
        0
      )
      return { ...child, executionCount: executions.length, totalTokens }
    })
  )

  return successResponse(c, childrenWithExecutions)
})

agentX.post('/tasks', async (c) => {
  const data = validateSchema(
    taskSchema,
    await c.req.json(),
    'agent_x',
    'Invalid task data'
  )

  const taskData = {
    ...data,
    status: 'pending' as const,
    priority: data.priority ?? ('medium' as const),
    parentTaskId: null,
    output: null,
    maxRetries: 1,
    retryCount: 0,
    assignedDepartmentId: data.assignedDepartmentId ?? null,
    assignedAgentId: data.assignedAgentId ?? null,
    input: data.input ?? null,
    cronExpression: data.cronExpression ?? null
  }

  const result = await handleDatabaseOperation(
    () => createTask(taskData),
    'Failed to create task'
  )

  if (result.cronExpression) {
    // Recurring task: register with cron scheduler
    scheduleTask(result.id, result.cronExpression)
  } else {
    // One-time task: smart dispatch (auto-route, check availability, shadow/queue)
    smartDispatch(
      result.id,
      result.title,
      result.description ?? null,
      result.priority,
      result.assignedAgentId ?? null,
      false,
      (event) => emitToTask(result.id, event)
    ).catch((err) => console.error('Smart dispatch error:', err))
  }

  return successResponse(c, result, 201)
})

agentX.put('/tasks/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const body = await c.req.json()

  // Handle cancel
  if (body.status === 'cancelled') {
    unscheduleTask(id) // no-op for non-cron tasks
    const result = await handleDatabaseOperation(
      () => updateTask(id, { status: 'cancelled' }),
      'Failed to cancel task'
    )
    emitToTask(id, {
      type: 'task_status',
      taskId: id,
      status: 'cancelled' as never
    })
    return successResponse(c, result)
  }

  // Handle restore (cancelled → pending, re-dispatch)
  if (body._action === 'restore') {
    const taskRecord = await handleDatabaseOperation(
      () => getTaskById(id),
      'Failed to get task'
    )
    if (!taskRecord)
      throw new ChatSDKError('not_found:agent_x', 'Task not found')

    const result = await handleDatabaseOperation(
      () => updateTask(id, { status: 'pending', retryCount: 0 }),
      'Failed to restore task'
    )
    emitToTask(id, {
      type: 'task_status',
      taskId: id,
      status: 'pending' as never
    })

    if (taskRecord.cronExpression) {
      // Cron task: re-register with scheduler and let it fire at next scheduled time
      scheduleTask(id, taskRecord.cronExpression)
    } else {
      // One-time task: re-dispatch immediately
      smartDispatch(
        id,
        taskRecord.title,
        taskRecord.description ?? null,
        taskRecord.priority,
        taskRecord.assignedAgentId ?? null,
        false,
        (event) => emitToTask(id, event)
      ).catch((err) => console.error('Restore dispatch error:', err))
    }

    return successResponse(c, result)
  }

  // Handle general edit (title, description, priority, cronExpression, agent/dept)
  if (body._action === 'edit') {
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined)
      updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if ('assignedAgentId' in body)
      updateData.assignedAgentId = body.assignedAgentId
    if ('assignedDepartmentId' in body)
      updateData.assignedDepartmentId = body.assignedDepartmentId
    if ('cronExpression' in body) {
      unscheduleTask(id)
      updateData.cronExpression = body.cronExpression
      if (body.cronExpression) scheduleTask(id, body.cronExpression)
    }
    const result = await handleDatabaseOperation(
      () => updateTask(id, updateData as Parameters<typeof updateTask>[1]),
      'Failed to update task'
    )
    return successResponse(c, result)
  }

  // Handle reassign
  if (body.assignedAgentId) {
    const agentRecord = await getAgentById(body.assignedAgentId)
    if (!agentRecord) {
      throw new ChatSDKError('not_found:agent_x', 'Agent not found')
    }

    const result = await handleDatabaseOperation(
      () =>
        updateTask(id, {
          assignedAgentId: body.assignedAgentId,
          assignedDepartmentId:
            body.assignedDepartmentId ?? agentRecord.departmentId,
          status: 'pending'
        }),
      'Failed to reassign task'
    )

    // Start execution
    executeTask(id, (event) => emitToTask(id, event)).catch((err) =>
      console.error('Task execution error:', err)
    )

    return successResponse(c, result)
  }

  return successResponse(c, { id })
})

// ─── Auto-Route ─────────────────────────────────────────────────────────────

agentX.post('/auto-route', async (c) => {
  const { description } = (await c.req.json()) as { description: string }

  if (!description) {
    throw new ChatSDKError('bad_request:agent_x', 'Description is required')
  }

  const result = await autoRouteTask(description)
  return successResponse(c, result)
})

// ─── Auto-Fill ──────────────────────────────────────────────────────────────

agentX.post('/auto-fill', async (c) => {
  const { title } = (await c.req.json()) as { title: string }

  if (!title) {
    throw new ChatSDKError('bad_request:agent_x', 'Title is required')
  }

  const result = await autoFillTask(title)
  return successResponse(c, result)
})

// ─── Available Skills & MCP ──────────────────────────────────────────────────

agentX.get('/available-skills', async (c) => {
  const skills = await listInstalledSkills()
  return successResponse(
    c,
    skills.map((s) => ({
      slug: s.slug,
      name: s.displayName,
      isActive: s.isActive
    }))
  )
})

// MCP Server routes moved to /api/mcp

// ─── SSE Endpoints ──────────────────────────────────────────────────────────

// SSE for a single task
agentX.get('/tasks/:id/sse', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')

  const stream = new ReadableStream({
    start(controller) {
      if (!taskClients.has(id)) {
        taskClients.set(id, new Set())
      }
      taskClients.get(id)!.add(controller)

      c.req.raw.signal.addEventListener('abort', () => {
        taskClients.get(id)?.delete(controller)
        if (taskClients.get(id)?.size === 0) {
          taskClients.delete(id)
        }
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

// SSE for all active tasks
agentX.get('/sse', async (c) => {
  const stream = new ReadableStream({
    start(controller) {
      globalClients.add(controller)

      c.req.raw.signal.addEventListener('abort', () => {
        globalClients.delete(controller)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

// ─── Position Updates ───────────────────────────────────────────────────────

const positionUpdateSchema = z.object({
  updates: z.array(
    z.object({
      type: z.enum(['department', 'agent']),
      id: z.string().uuid(),
      position: z.object({ x: z.number(), y: z.number() })
    })
  )
})

agentX.patch('/positions', async (c) => {
  const { updates } = validateSchema(
    positionUpdateSchema,
    await c.req.json(),
    'agent_x',
    'Invalid position data'
  )

  await handleDatabaseOperation(
    () => batchUpdatePositions(updates),
    'Failed to update positions'
  )

  return successResponse(c, { success: true })
})

export default agentX
