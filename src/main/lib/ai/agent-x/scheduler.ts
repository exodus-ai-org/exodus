import cron, { type ScheduledTask } from 'node-cron'

import {
  createTask,
  getCronTasks,
  getTaskById,
  updateTask
} from '../../db/agent-x-queries'
import { logger } from '../../logger'
import type { SseEmitter } from './smart-dispatch'
import { smartDispatch } from './smart-dispatch'

// taskId → node-cron ScheduledTask
const scheduledJobs = new Map<string, ScheduledTask>()

// Global emitter set on init
let globalEmit: SseEmitter = () => {}

export function setSchedulerEmitter(emit: SseEmitter) {
  globalEmit = emit
}

/**
 * Register a cron task. Replaces any existing job for the same taskId.
 */
export function scheduleTask(taskId: string, cronExpression: string): boolean {
  if (!cron.validate(cronExpression)) {
    logger.error('scheduler', 'Invalid cron expression', {
      taskId,
      cronExpression
    })
    return false
  }

  unscheduleTask(taskId)

  const job = cron.schedule(cronExpression, async () => {
    try {
      const template = await getTaskById(taskId)
      if (!template || template.status === 'cancelled') {
        unscheduleTask(taskId)
        return
      }

      // Create a one-off child task from the template
      const childTask = await createTask({
        parentTaskId: taskId,
        title: template.title,
        description: template.description,
        priority: template.priority,
        assignedAgentId: template.assignedAgentId,
        assignedDepartmentId: template.assignedDepartmentId,
        input: template.input,
        status: 'pending',
        maxRetries: template.maxRetries ?? 1,
        retryCount: 0
      })

      await updateTask(taskId, { lastRunAt: new Date() })

      globalEmit({
        type: 'cron_fired',
        scheduleTaskId: taskId,
        childTaskId: childTask.id
      })

      // Smart-dispatch the child task
      await smartDispatch(
        childTask.id,
        childTask.title,
        childTask.description ?? null,
        childTask.priority,
        childTask.assignedAgentId ?? null,
        true, // isCronChild
        globalEmit
      )

      // Update template's lastRunStatus based on how the child finished
      const finishedChild = await getTaskById(childTask.id)
      const lastRunStatus =
        finishedChild?.status === 'completed' ? 'completed' : 'failed'
      await updateTask(taskId, { lastRunStatus })
    } catch (err) {
      logger.error('scheduler', 'Cron task execution error', {
        taskId,
        error: String(err)
      })
    }
  })

  scheduledJobs.set(taskId, job)
  logger.info('scheduler', 'Scheduled task', { taskId, cronExpression })
  return true
}

export function unscheduleTask(taskId: string) {
  const job = scheduledJobs.get(taskId)
  if (job) {
    job.stop()
    scheduledJobs.delete(taskId)
    logger.info('scheduler', 'Unscheduled task', { taskId })
  }
}

export function getScheduledTaskIds(): string[] {
  return Array.from(scheduledJobs.keys())
}

/**
 * Load all active cron tasks from DB and schedule them.
 * Call once on server startup.
 */
export async function initScheduler(emit: SseEmitter): Promise<void> {
  setSchedulerEmitter(emit)

  const tasks = await getCronTasks()
  let count = 0
  for (const t of tasks) {
    if (t.cronExpression && scheduleTask(t.id, t.cronExpression)) {
      count++
    }
  }
  logger.info('scheduler', 'Initialized', { activeTasks: count })
}
