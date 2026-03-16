import type { AgentXSseEvent } from '@shared/types/agent-x'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'
import { autoRouteTask } from '../../ai/agent-x/auto-router'
import {
  executeTask,
  resolveEscalation
} from '../../ai/agent-x/execution-engine'
import { listInstalledSkills } from '../../ai/skills/skills-manager'
import {
  batchUpdatePositions,
  createAgent,
  createDepartment,
  createMcpServer,
  createTask,
  deleteAgent,
  deleteDepartment,
  deleteMcpServer,
  getAgentById,
  getAllAgents,
  getAllDepartments,
  getAllMcpServers,
  getAllTasks,
  getEventsByExecutionId,
  getExecutionsByTaskId,
  getTaskById,
  updateAgent,
  updateDepartment,
  updateMcpServer,
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
  input: z.record(z.string(), z.unknown()).optional().nullable()
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
    input: data.input ?? null
  }

  const result = await handleDatabaseOperation(
    () => createTask(taskData),
    'Failed to create task'
  )

  // If agent is assigned, start execution in background
  if (result.assignedAgentId) {
    executeTask(result.id, (event) => emitToTask(result.id, event)).catch(
      (err) => console.error('Task execution error:', err)
    )
  }

  return successResponse(c, result, 201)
})

agentX.put('/tasks/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const body = await c.req.json()

  // Handle cancel
  if (body.status === 'cancelled') {
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

// User responds to escalation
agentX.post('/tasks/:id/respond', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const { response } = (await c.req.json()) as { response: string }

  if (!response) {
    throw new ChatSDKError('bad_request:agent_x', 'Response is required')
  }

  // Resume the agent by resolving the escalation promise
  resolveEscalation(id, response)

  // Update task status back to running
  await updateTask(id, { status: 'running' })
  emitToTask(id, {
    type: 'task_status',
    taskId: id,
    status: 'running' as never
  })

  return successResponse(c, { success: true })
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

// ─── MCP Server Registry ────────────────────────────────────────────────────

const mcpServerSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional().nullable(),
  isActive: z.boolean().optional()
})

agentX.get('/mcp-servers', async (c) => {
  const servers = await handleDatabaseOperation(
    () => getAllMcpServers(),
    'Failed to get MCP servers'
  )
  return successResponse(c, servers)
})

agentX.post('/mcp-servers', async (c) => {
  const data = validateSchema(
    mcpServerSchema,
    await c.req.json(),
    'agent_x',
    'Invalid MCP server data'
  )
  const result = await handleDatabaseOperation(
    () => createMcpServer(data),
    'Failed to create MCP server'
  )
  return successResponse(c, result, 201)
})

agentX.put('/mcp-servers/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  const data = validateSchema(
    mcpServerSchema.partial(),
    await c.req.json(),
    'agent_x',
    'Invalid MCP server data'
  )
  const result = await handleDatabaseOperation(
    () => updateMcpServer(id, data),
    'Failed to update MCP server'
  )
  return successResponse(c, result)
})

agentX.delete('/mcp-servers/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'agent_x')
  await handleDatabaseOperation(
    () => deleteMcpServer(id),
    'Failed to delete MCP server'
  )
  return c.text('MCP server deleted successfully', 200)
})

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
