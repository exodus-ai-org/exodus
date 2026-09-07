// src/renderer/components/philharmonic/schedule/schedule-tab.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  cancelScheduledTask,
  getRecurringTasks,
  getUpcomingTasks
} from '@/services/philharmonic-tasks'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

import { RecurringList } from './recurring-list'
import { ScheduleTaskForm } from './schedule-task-form'
import { UpcomingList } from './upcoming-list'

export function ScheduleTab({
  conversations
}: {
  conversations: ConversationData[]
}) {
  const [upcoming, setUpcoming] = useState<TaskData[]>([])
  const [recurring, setRecurring] = useState<TaskData[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    getUpcomingTasks()
      .then(setUpcoming)
      .catch((err) =>
        sileo.error({
          title: 'Could not load upcoming tasks',
          description: err instanceof Error ? err.message : String(err)
        })
      )
    getRecurringTasks()
      .then(setRecurring)
      .catch((err) =>
        sileo.error({
          title: 'Could not load recurring tasks',
          description: err instanceof Error ? err.message : String(err)
        })
      )
  }, [])

  const conversationsById = useMemo(
    () => Object.fromEntries(conversations.map((c) => [c.id, c])),
    [conversations]
  )

  const handleCreated = useCallback((task: TaskData) => {
    if (task.cronExpression) {
      setRecurring((p) => [task, ...p])
    } else {
      setUpcoming((p) => {
        const next = [...p, task]
        next.sort((a, b) => (a.runAt ?? '').localeCompare(b.runAt ?? ''))
        return next
      })
    }
  }, [])

  const handleCancel = useCallback(async (id: string) => {
    setCancellingId(id)
    try {
      await cancelScheduledTask(id)
      setUpcoming((p) => p.filter((t) => t.id !== id))
      setRecurring((p) => p.filter((t) => t.id !== id))
      sileo.success({ title: 'Task cancelled' })
    } catch (err) {
      sileo.error({
        title: 'Could not cancel task',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setCancellingId(null)
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <span className="text-foreground text-sm font-semibold">Schedule</span>
        <Button
          data-testid={TEST_IDS.schedule.createButton}
          type="button"
          size="sm"
          onClick={() => setFormOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Schedule task
        </Button>
      </div>
      <Tabs defaultValue="upcoming" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 w-fit shrink-0">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="min-h-0 flex-1">
          <UpcomingList
            tasks={upcoming}
            conversationsById={conversationsById}
            cancellingId={cancellingId}
            onCancel={handleCancel}
          />
        </TabsContent>
        <TabsContent value="recurring" className="min-h-0 flex-1">
          <RecurringList
            tasks={recurring}
            conversationsById={conversationsById}
            cancellingId={cancellingId}
            onCancel={handleCancel}
          />
        </TabsContent>
      </Tabs>
      <ScheduleTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        conversations={conversations}
        onCreated={handleCreated}
      />
    </div>
  )
}
