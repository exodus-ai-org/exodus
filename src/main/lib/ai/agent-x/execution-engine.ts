// src/main/lib/ai/agent-x/execution-engine.ts
import {
  createTaskExecution,
  getAgentById,
  updateTask,
  updateTaskExecution
} from '../../db/agent-x-queries'
import { rememberTaskOutcome } from './agent-memory'
import { runEmployeeLoop, type SseEmitter } from './employee-loop'

/**
 * Run one delegated employee task end-to-end: mark running, create the
 * execution row, run the employee loop, mark completed/failed. Returns the
 * employee's final text output for the PM to review.
 */
export async function runDelegatedTask(args: {
  taskId: string
  agentId: string
  conversationId: string
  instructions: string
  emit: SseEmitter
  signal?: AbortSignal
}): Promise<string> {
  const { taskId, agentId, conversationId, instructions, emit, signal } = args
  const agent = await getAgentById(agentId)
  if (!agent) throw new Error(`Agent ${agentId} not found`)

  await updateTask(taskId, { status: 'running' })
  const execution = await createTaskExecution({
    taskId,
    agentId,
    status: 'running',
    error: null,
    tokenUsage: null
  })

  try {
    const output = await runEmployeeLoop({
      agent,
      instructions,
      executionId: execution.id,
      conversationId,
      emit,
      signal
    })
    await updateTask(taskId, {
      status: 'completed',
      output: { result: output },
      completedAt: new Date()
    })
    await rememberTaskOutcome(agentId, instructions, output)
    return output
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateTaskExecution(execution.id, {
      status: 'failed',
      completedAt: new Date(),
      error: message
    })
    await updateTask(taskId, { status: 'failed' })
    throw err
  }
}
