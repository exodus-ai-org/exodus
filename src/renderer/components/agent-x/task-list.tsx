import type { AgentXSseEvent } from '@shared/types/agent-x'
import {
  AlertCircleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronUpIcon,
  CircleDotIcon,
  ClockIcon,
  MessageSquareIcon,
  XCircleIcon
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { respondToEscalation } from '@/services/agent-x'
import type { AgentData, TaskData } from '@/stores/agent-x'

interface TaskListProps {
  tasks: TaskData[]
  agents: AgentData[]
  events: AgentXSseEvent[]
  onSelectTask: (taskId: string) => void
  expanded?: boolean
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <ClockIcon className="size-3.5" style={{ color: '#FEBC2E' }} />,
  running: (
    <CircleDotIcon
      className="size-3.5 animate-pulse"
      style={{ color: '#FEBC2E' }}
    />
  ),
  completed: (
    <CheckCircle2Icon className="size-3.5" style={{ color: '#28C840' }} />
  ),
  failed: <XCircleIcon className="size-3.5" style={{ color: '#FF5F57' }} />,
  cancelled: <XCircleIcon className="text-muted-foreground size-3.5" />,
  waiting_for_user: (
    <MessageSquareIcon className="size-3.5" style={{ color: '#FEBC2E' }} />
  )
}

export function TaskList({
  tasks,
  agents,
  events,
  onSelectTask,
  expanded: expandedProp
}: TaskListProps) {
  const [expandedState, setExpanded] = useState(true)
  const expanded = expandedProp ?? expandedState
  const [escalationResponse, setEscalationResponse] = useState('')

  const counts = useMemo(() => {
    const running = tasks.filter((t) => t.status === 'running').length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const failed = tasks.filter((t) => t.status === 'failed').length
    return { running, completed, failed }
  }, [tasks])

  // Find active escalation events
  const escalations = useMemo(() => {
    const waitingTasks = tasks.filter((t) => t.status === 'waiting_for_user')
    return waitingTasks.map((t) => {
      const escEvent = [...events]
        .reverse()
        .find((e) => e.type === 'escalation' && e.taskId === t.id)
      return {
        task: t,
        event: escEvent as
          | Extract<AgentXSseEvent, { type: 'escalation' }>
          | undefined
      }
    })
  }, [tasks, events])

  const handleRespond = useCallback(
    async (taskId: string) => {
      if (!escalationResponse.trim()) return
      await respondToEscalation(taskId, escalationResponse)
      setEscalationResponse('')
    },
    [escalationResponse]
  )

  return (
    <div className="border-t">
      {/* Header bar */}
      <Button
        variant="ghost"
        className="flex w-full items-center justify-start gap-3 px-4 py-2 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronUpIcon
          data-icon
          className={cn(
            'size-3.5 transition-transform',
            expanded ? '' : 'rotate-180'
          )}
        />
        <span className="font-medium">Task Queue</span>
        <div className="text-muted-foreground flex items-center gap-3">
          <span style={{ color: '#FEBC2E' }}>Running: {counts.running}</span>
          <span style={{ color: '#28C840' }}>
            Completed: {counts.completed}
          </span>
          <span style={{ color: '#FF5F57' }}>Failed: {counts.failed}</span>
        </div>
      </Button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto">
          {/* Escalation alerts */}
          {escalations.map(
            ({ task: t, event: esc }) =>
              esc && (
                <Alert key={`esc-${t.id}`} className="mx-4 mb-2">
                  <AlertCircleIcon />
                  <AlertTitle>{t.title}</AlertTitle>
                  <AlertDescription>{esc.question}</AlertDescription>
                  {esc.options.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {esc.options.map((opt) => (
                        <Button
                          key={opt}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => respondToEscalation(t.id, opt)}
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={escalationResponse}
                        onChange={(e) => setEscalationResponse(e.target.value)}
                        placeholder="Type your response..."
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRespond(t.id)
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRespond(t.id)}
                      >
                        Send
                      </Button>
                    </div>
                  )}
                </Alert>
              )
          )}

          {/* Task rows */}
          {tasks.length === 0 ? (
            <div className="text-muted-foreground px-4 py-4 text-center text-xs">
              No tasks yet. Dispatch a task to get started.
            </div>
          ) : (
            tasks.map((t) => {
              const agentName =
                agents.find((a) => a.id === t.assignedAgentId)?.name ?? '—'
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-start gap-3 px-4 py-1.5 text-xs"
                  onClick={() => onSelectTask(t.id)}
                >
                  {t.cronExpression ? (
                    <CalendarClockIcon
                      className="size-3.5 shrink-0"
                      style={{ color: '#6366f1' }}
                    />
                  ) : (
                    (statusIcons[t.status] ?? null)
                  )}
                  <span className="flex-1 truncate text-left font-medium">
                    {t.title}
                  </span>
                  {t.cronExpression && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {t.cronExpression}
                    </Badge>
                  )}
                  <span className="text-muted-foreground shrink-0">
                    {agentName}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {t.status}
                  </span>
                </Button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
