import { format } from 'date-fns'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { groupTasksByDay } from './group-tasks-by-day'
import { TaskCard } from './task-card'

export function UpcomingList({
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
  const groups = groupTasksByDay(tasks)

  if (groups.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-sm">
        No upcoming one-off tasks. Schedule one to see it here.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {groups.map((group) => (
          <div key={group.day.toISOString()}>
            <div className="bg-card text-muted-foreground sticky top-0 z-10 mb-2 py-1 text-xs font-semibold">
              {group.label}
            </div>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  groupTitle={
                    conversationsById[task.conversationId ?? '']?.title ??
                    'Unknown group'
                  }
                  subtitle={format(new Date(task.runAt!), 'HH:mm')}
                  onCancel={onCancel}
                  cancelling={cancellingId === task.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
