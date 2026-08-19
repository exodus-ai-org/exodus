// src/renderer/components/philharmonic/schedule/recurring-list.tsx
import { CronExpressionParser } from 'cron-parser'
import { format } from 'date-fns'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { TaskCard } from './task-card'

function describeSchedule(task: TaskData): string {
  if (!task.cronExpression) return ''
  const lastRun = task.lastRunAt
    ? `last ${format(new Date(task.lastRunAt), 'MMM d, HH:mm')} · `
    : ''
  try {
    const next = CronExpressionParser.parse(task.cronExpression).next().toDate()
    return `${lastRun}${task.cronExpression} · next ${format(next, 'MMM d, HH:mm')}`
  } catch {
    return `${lastRun}${task.cronExpression}`
  }
}

export function RecurringList({
  tasks,
  conversationsById,
  cancellingId,
  onCancel
}: {
  tasks: TaskData[]
  conversationsById: Record<string, ConversationData>
  cancellingId: string | null
  onCancel: (id: string) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-(--ph-text-muted)">
        No recurring tasks yet.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            groupTitle={
              conversationsById[task.conversationId ?? '']?.title ??
              'Unknown group'
            }
            subtitle={describeSchedule(task)}
            onCancel={onCancel}
            cancelling={cancellingId === task.id}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
