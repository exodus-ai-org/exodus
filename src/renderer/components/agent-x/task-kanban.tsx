import { cn } from '@/lib/utils'
import { submitTaskFeedback } from '@/services/agent-x'
import type { AgentData, TaskData } from '@/stores/agent-x'
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  MessageSquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

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
    status: 'waiting_for_user',
    label: 'Awaiting Input',
    icon: <MessageSquareIcon className="h-3.5 w-3.5" />,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30'
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
        // Submit with note
        onFeedback(task.id, rating, note)
        setExpanded(false)
        setNote('')
      } else {
        // First click on a thumb — expand for optional note
        setExpanded(true)
      }
    },
    [task.id, expanded, note, onFeedback]
  )

  // Already has feedback
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
        <button
          onClick={() => handleRate('positive')}
          className="text-muted-foreground rounded p-0.5 transition-colors hover:text-green-500"
        >
          <ThumbsUpIcon className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleRate('negative')}
          className="text-muted-foreground rounded p-0.5 transition-colors hover:text-red-500"
        >
          <ThumbsDownIcon className="h-3 w-3" />
        </button>
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
          <button
            onClick={() => {
              onFeedback(task.id, 'positive', note)
              setExpanded(false)
              setNote('')
            }}
            className="text-muted-foreground hover:text-foreground text-[10px]"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  agents,
  onSelect,
  onFeedback
}: {
  task: TaskData
  agents: AgentData[]
  onSelect: (id: string) => void
  onFeedback: (
    id: string,
    rating: 'positive' | 'negative',
    note: string
  ) => void
}) {
  const agentName =
    agents.find((a) => a.id === task.assignedAgentId)?.name ?? null
  const isResolved = RESOLVED_STATUSES.has(task.status)

  return (
    <div
      onClick={() => onSelect(task.id)}
      className="bg-background hover:bg-accent/50 flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left text-xs shadow-sm transition-colors"
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
      </div>

      <div className="text-muted-foreground flex items-center gap-2 pl-4">
        {task.cronExpression && (
          <span className="flex items-center gap-0.5 rounded bg-indigo-100 px-1 py-0.5 font-mono text-[10px] text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            <CalendarClockIcon className="h-2.5 w-2.5" />
            {task.cronExpression}
          </span>
        )}
        {agentName && <span className="truncate">{agentName}</span>}
        {!agentName && !task.cronExpression && (
          <span className="italic">Unassigned</span>
        )}
      </div>

      {isResolved && (
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
  onSelectTask: (taskId: string) => void
  onTaskUpdate?: (task: TaskData) => void
}

export function TaskKanban({
  tasks,
  agents,
  onSelectTask,
  onTaskUpdate
}: TaskKanbanProps) {
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

  return (
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
                  onSelect={onSelectTask}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
