// src/renderer/components/philharmonic/schedule/task-card.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { Loader2Icon, XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TaskData } from '@/stores/philharmonic'

const STATUS_LABEL: Record<TaskData['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  waiting_for_user: 'Waiting'
}

const PRIORITY_LABEL: Record<TaskData['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

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
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          <Badge
            variant={task.status === 'failed' ? 'destructive' : 'secondary'}
            className="shrink-0 text-[10px]"
          >
            {STATUS_LABEL[task.status]}
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
          aria-label="Cancel scheduled task"
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
