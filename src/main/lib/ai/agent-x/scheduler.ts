import cron, { type ScheduledTask } from 'node-cron'
import {
  createTask,
  getCronTasks,
  getTaskById,
  updateTask
} from '../../db/agent-x-queries'
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
    console.error(
      `[Scheduler] Invalid cron expression for task ${taskId}: "${cronExpression}"`
    )
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
    } catch (err) {
      console.error(`[Scheduler] Cron task ${taskId} execution error:`, err)
    }
  })

  scheduledJobs.set(taskId, job)
  console.log(
    `[Scheduler] Scheduled task ${taskId} with expression "${cronExpression}"`
  )
  return true
}

export function unscheduleTask(taskId: string) {
  const job = scheduledJobs.get(taskId)
  if (job) {
    job.stop()
    scheduledJobs.delete(taskId)
    console.log(`[Scheduler] Unscheduled task ${taskId}`)
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
  console.log(`[Scheduler] Initialized — ${count} cron task(s) active`)
}
