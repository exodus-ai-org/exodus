// src/renderer/components/philharmonic/schedule/task-card.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { Loader2Icon, XIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TaskData } from '@/stores/philharmonic'

export function TaskCard({
  task,
  groupTitle,
  subtitle,
  onCancel,
  cancelling
}: {
  task: TaskData
  groupTitle: string
  /** Recurring: cron expression + next-run text. One-off: time of day. */
  subtitle: string
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const { t } = useTranslation('philharmonic')
  const statusLabel: Record<TaskData['status'], string> = useMemo(
    () => ({
      pending: t('schedule.taskCard.status.pending'),
      running: t('schedule.taskCard.status.running'),
      completed: t('schedule.taskCard.status.completed'),
      failed: t('schedule.taskCard.status.failed'),
      cancelled: t('schedule.taskCard.status.cancelled'),
      waiting_for_user: t('schedule.taskCard.status.waiting_for_user')
    }),
    [t]
  )
  const priorityLabel: Record<TaskData['priority'], string> = useMemo(
    () => ({
      low: t('schedule.taskCard.priority.low'),
      medium: t('schedule.taskCard.priority.medium'),
      high: t('schedule.taskCard.priority.high'),
      urgent: t('schedule.taskCard.priority.urgent')
    }),
    [t]
  )
  const cancellable = task.status === 'pending'
  return (
    <div
      data-testid={TEST_IDS.schedule.taskCard}
      className="border-border bg-card flex items-start justify-between gap-3 rounded-xl border p-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground truncate text-sm font-semibold">
            {task.title}
          </span>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {priorityLabel[task.priority]}
          </Badge>
          <Badge
            variant={task.status === 'failed' ? 'destructive' : 'secondary'}
            className="shrink-0 text-[10px]"
          >
            {statusLabel[task.status]}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 truncate text-xs">
          {groupTitle} · {subtitle}
        </div>
      </div>
      {cancellable && (
        <Button
          data-testid={TEST_IDS.schedule.cancelButton}
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
          disabled={cancelling}
          onClick={() => onCancel(task.id)}
          aria-label={t('schedule.taskCard.cancelAria')}
        >
          {cancelling ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  )
}
