import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  restoreTaskApi,
  submitTaskFeedback,
  updateTaskApi
} from '@/services/agent-x'
import type { AgentData, DepartmentData, TaskData } from '@/stores/agent-x'
import {
  AlertCircleIcon,
  BotIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  CircleDotIcon,
  ClockIcon,
  PencilIcon,
  RotateCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
  XIcon
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { TaskDispatchDialog } from './task-dispatch-dialog'

// ─── Column definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  status: string
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}

const COLUMNS: ColumnDef[] = [
  {
    status: 'pending',
    label: 'Pending',
    icon: <ClockIcon className="h-3.5 w-3.5" />,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  {
    status: 'running',
    label: 'Running',
    icon: <CircleDotIcon className="h-3.5 w-3.5 animate-pulse" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: <CheckCircle2Icon className="h-3.5 w-3.5" />,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  {
    status: 'failed',
    label: 'Failed',
    icon: <XCircleIcon className="h-3.5 w-3.5" />,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30'
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    icon: <XCircleIcon className="h-3.5 w-3.5" />,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/40'
  }
]

const RESOLVED_STATUSES = new Set(['completed', 'failed', 'cancelled'])

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400'
}

// ─── Feedback widget ─────────────────────────────────────────────────────────

function FeedbackWidget({
  task,
  onFeedback
}: {
  task: TaskData
  onFeedback: (
    id: string,
    rating: 'positive' | 'negative',
    note: string
  ) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')

  const handleRate = useCallback(
    (rating: 'positive' | 'negative') => {
      if (expanded) {
        onFeedback(task.id, rating, note)
        setExpanded(false)
        setNote('')
      } else {
        setExpanded(true)
      }
    },
    [task.id, expanded, note, onFeedback]
  )

  if (task.feedbackRating) {
    return (
      <div className="flex items-center gap-1.5 pt-1">
        {task.feedbackRating === 'positive' ? (
          <ThumbsUpIcon className="h-3 w-3 text-green-500" />
        ) : (
          <ThumbsDownIcon className="h-3 w-3 text-red-500" />
        )}
        {task.feedbackNote && (
          <span className="text-muted-foreground line-clamp-1 text-[10px]">
            {task.feedbackNote}
          </span>
        )}
        {!task.feedbackNote && (
          <span className="text-muted-foreground text-[10px]">Reviewed</span>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-1.5 pt-1"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-[10px]">Review:</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRate('positive')}
          className="text-muted-foreground hover:text-green-500"
        >
          <ThumbsUpIcon className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleRate('negative')}
          className="text-muted-foreground hover:text-red-500"
        >
          <ThumbsDownIcon className="h-3 w-3" />
        </Button>
      </div>
      {expanded && (
        <div className="flex gap-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What could be improved?"
            className="bg-muted flex-1 rounded px-1.5 py-0.5 text-[10px] outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRate('positive')
            }}
            autoFocus
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onFeedback(task.id, 'positive', note)
              setExpanded(false)
              setNote('')
            }}
            className="text-[10px]"
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  agents,
  departments,
  onSelect,
  onFeedback,
  onEdit,
  onCancel,
  onRestore
}: {
  task: TaskData
  agents: AgentData[]
  departments: DepartmentData[]
  onSelect: (id: string) => void
  onFeedback: (
    id: string,
    rating: 'positive' | 'negative',
    note: string
  ) => void
  onEdit: (task: TaskData) => void
  onCancel: (id: string) => void
  onRestore: (id: string) => void
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const agent = agents.find((a) => a.id === task.assignedAgentId) ?? null
  const dept =
    departments.find((d) => d.id === task.assignedDepartmentId) ?? null
  const isCronTemplate = !!task.cronExpression
  const isResolved = RESOLVED_STATUSES.has(task.status)
  const canCancel = task.status === 'pending' || task.status === 'running'
  const canEdit = isCronTemplate
  const canRestore = task.status === 'cancelled'

  return (
    <div
      onClick={() => !confirmingCancel && onSelect(task.id)}
      className="bg-background hover:bg-accent/50 group relative flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left text-xs shadow-sm transition-colors"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.medium
          )}
        />
        <span className="line-clamp-2 flex-1 text-[13px] leading-snug font-medium">
          {task.title}
        </span>

        {/* Hover actions */}
        <div
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Restore button for cancelled tasks */}
          {canRestore && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRestore(task.id)}
              className="text-muted-foreground hover:text-foreground h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
              title="Restore task"
            >
              <RotateCcwIcon className="h-3 w-3" />
            </Button>
          )}

          {/* Edit button for cron tasks */}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(task)}
              className="text-muted-foreground hover:text-foreground h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
              title="Edit schedule"
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          )}

          {/* Cancel with inline confirm */}
          {canCancel && !confirmingCancel && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmingCancel(true)}
              className="text-muted-foreground hover:text-destructive h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
              title="Cancel task"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
          {canCancel && confirmingCancel && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[10px]">Cancel?</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  onCancel(task.id)
                  setConfirmingCancel(false)
                }}
                className="h-5 w-5 text-red-500 hover:text-red-600"
              >
                <CheckCircle2Icon className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfirmingCancel(false)}
                className="text-muted-foreground hover:text-foreground h-5 w-5"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 pl-4">
        {/* Dept → Agent assignment */}
        {agent || dept ? (
          <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-[10px]">
            {dept && (
              <>
                <Building2Icon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{dept.name}</span>
              </>
            )}
            {dept && agent && (
              <ChevronRightIcon className="h-2.5 w-2.5 shrink-0 opacity-40" />
            )}
            {agent && (
              <>
                <BotIcon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{agent.name}</span>
              </>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px] italic">
            Unassigned
          </span>
        )}

        {/* Cron expression */}
        {task.cronExpression && (
          <span className="flex items-center gap-1 text-[10px] text-indigo-500 dark:text-indigo-400">
            <CalendarClockIcon className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate font-mono">{task.cronExpression}</span>
          </span>
        )}

        {/* Last run info for cron templates */}
        {isCronTemplate && task.lastRunAt && (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            {task.lastRunStatus === 'completed' ? (
              <CheckIcon className="h-2.5 w-2.5 shrink-0 text-green-500" />
            ) : task.lastRunStatus === 'failed' ? (
              <AlertCircleIcon className="h-2.5 w-2.5 shrink-0 text-red-500" />
            ) : null}
            <span>
              Last{' '}
              {new Date(task.lastRunAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </span>
        )}
        {isCronTemplate && !task.lastRunAt && (
          <span className="text-muted-foreground text-[10px] italic">
            Not yet run
          </span>
        )}
      </div>

      {isResolved && !isCronTemplate && (
        <div className="border-t pt-1 pl-4">
          <FeedbackWidget task={task} onFeedback={onFeedback} />
        </div>
      )}
    </div>
  )
}

// ─── Kanban ──────────────────────────────────────────────────────────────────

interface TaskKanbanProps {
  tasks: TaskData[]
  agents: AgentData[]
  departments: DepartmentData[]
  onSelectTask: (taskId: string) => void
  onTaskUpdate?: (task: TaskData) => void
}

export function TaskKanban({
  tasks,
  agents,
  departments,
  onSelectTask,
  onTaskUpdate
}: TaskKanbanProps) {
  const [editTask, setEditTask] = useState<TaskData | null>(null)

  const grouped = useMemo(() => {
    const map: Record<string, TaskData[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const t of tasks) {
      if (map[t.status]) {
        map[t.status].push(t)
      }
    }
    return map
  }, [tasks])

  const handleFeedback = useCallback(
    async (taskId: string, rating: 'positive' | 'negative', note: string) => {
      try {
        const updated = await submitTaskFeedback(taskId, {
          rating,
          note: note || undefined
        })
        onTaskUpdate?.(updated)
      } catch (err) {
        console.error('Failed to submit feedback:', err)
      }
    },
    [onTaskUpdate]
  )

  const handleCancel = useCallback(
    async (taskId: string) => {
      try {
        const updated = await updateTaskApi(taskId, { status: 'cancelled' })
        onTaskUpdate?.(updated)
      } catch (err) {
        console.error('Failed to cancel task:', err)
      }
    },
    [onTaskUpdate]
  )

  const handleRestore = useCallback(
    async (taskId: string) => {
      try {
        const updated = await restoreTaskApi(taskId)
        onTaskUpdate?.(updated)
      } catch (err) {
        console.error('Failed to restore task:', err)
      }
    },
    [onTaskUpdate]
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const items = grouped[col.status] ?? []
          return (
            <div
              key={col.status}
              className="flex w-64 shrink-0 flex-col rounded-xl border"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className={col.color}>{col.icon}</span>
                <span className="text-xs font-semibold">{col.label}</span>
                <span
                  className={cn(
                    'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    col.bg,
                    col.color
                  )}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {items.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-[11px]">
                    No tasks
                  </p>
                )}
                {items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    agents={agents}
                    departments={departments}
                    onSelect={onSelectTask}
                    onFeedback={handleFeedback}
                    onEdit={setEditTask}
                    onCancel={handleCancel}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit dialog for cron tasks */}
      <TaskDispatchDialog
        departments={departments}
        agents={agents}
        onTaskCreated={() => {}}
        editTask={editTask}
        editOpen={!!editTask}
        onEditClose={() => setEditTask(null)}
        onTaskUpdated={(updated) => {
          onTaskUpdate?.(updated)
          setEditTask(null)
        }}
      />
    </>
  )
}
