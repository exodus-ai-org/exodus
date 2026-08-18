// src/main/lib/ai/philharmonic/scheduler.ts
import cron, { type ScheduledTask } from 'node-cron'

import { createConversationMessage } from '../../db/conversation-queries'
import {
  getCronTasks,
  getDueOneOffTasks,
  getTaskById,
  updateTask
} from '../../db/philharmonic-queries'
import { logger } from '../../logger'
import type { SseEmitter } from './employee-loop'
import { runPmCoordinator } from './pm-coordinator'

const scheduledJobs = new Map<string, ScheduledTask>()
let globalEmit: SseEmitter = () => {}

export function setSchedulerEmitter(emit: SseEmitter) {
  globalEmit = emit
}

/** One scheduled firing: inject a system round-start message, run the PM loop. */
export async function runScheduledRound(
  taskId: string,
  emit: SseEmitter
): Promise<void> {
  const template = await getTaskById(taskId)
  if (
    !template ||
    template.status === 'cancelled' ||
    !template.conversationId
  ) {
    unscheduleTask(taskId)
    return
  }
  const label = `[Scheduled] ${template.title}`
  await createConversationMessage({
    conversationId: template.conversationId,
    role: 'system',
    content: label
  })
  emit({ type: 'round_start', conversationId: template.conversationId, label })
  await updateTask(taskId, { lastRunAt: new Date() })

  await runPmCoordinator({
    conversationId: template.conversationId,
    userText: `${template.title}\n\n${template.description ?? ''}`.trim(),
    emit
  })
  await updateTask(taskId, { lastRunStatus: 'completed' })
}

export function scheduleTask(taskId: string, cronExpression: string): boolean {
  if (!cron.validate(cronExpression)) {
    logger.error('scheduler', 'Invalid cron expression', {
      taskId,
      cronExpression
    })
    return false
  }
  unscheduleTask(taskId)
  const job = cron.schedule(cronExpression, () => {
    runScheduledRound(taskId, globalEmit).catch((err) =>
      logger.error('scheduler', 'Scheduled round error', {
        taskId,
        error: String(err)
      })
    )
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

/** Fire every due one-off task once, then mark it completed so it never re-fires. */
export async function runDueOneOffTasks(emit: SseEmitter): Promise<void> {
  const due = await getDueOneOffTasks()
  for (const t of due) {
    await runScheduledRound(t.id, emit)
    await updateTask(t.id, { status: 'completed' })
  }
}

export async function initScheduler(emit: SseEmitter): Promise<void> {
  setSchedulerEmitter(emit)
  const tasks = await getCronTasks()
  let count = 0
  for (const t of tasks) {
    if (t.cronExpression && scheduleTask(t.id, t.cronExpression)) count++
  }
  cron.schedule('* * * * *', () => {
    runDueOneOffTasks(globalEmit).catch((err) =>
      logger.error('scheduler', 'One-off sweep error', { error: String(err) })
    )
  })
  await runDueOneOffTasks(emit).catch((err) =>
    logger.error('scheduler', 'Initial one-off sweep error', {
      error: String(err)
    })
  )
  logger.info('scheduler', 'Initialized', { activeTasks: count })
}
