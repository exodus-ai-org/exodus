import { getTask } from '@/services/agent-x'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import {
  BotIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MessageSquareIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ExecutionTimelineProps {
  taskId: string
  events: AgentXSseEvent[]
  onClose: () => void
}

interface TaskDetail {
  id: string
  title: string
  status: string
  output: Record<string, unknown> | null
  executions?: Array<{
    id: string
    agentId: string
    status: string
    events: Array<{
      eventType: string
      payload: Record<string, unknown> | null
    }>
  }>
}

export function ExecutionTimeline({
  taskId,
  events,
  onClose
}: ExecutionTimelineProps) {
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null)

  useEffect(() => {
    getTask(taskId).then((t) => setTaskDetail(t as unknown as TaskDetail))
  }, [taskId])

  // Combine historical events and live events
  const allEvents: Array<{
    type: string
    content: string
    timestamp?: string
  }> = []

  // Add historical events from task detail
  if (taskDetail?.executions) {
    for (const exec of taskDetail.executions) {
      for (const evt of exec.events) {
        allEvents.push({
          type: evt.eventType,
          content:
            typeof evt.payload === 'object' && evt.payload
              ? JSON.stringify(evt.payload)
              : String(evt.payload ?? '')
        })
      }
    }
  }

  // Add live SSE events
  for (const evt of events) {
    if (evt.type === 'agent_start') {
      allEvents.push({
        type: 'agent_start',
        content: `Agent "${evt.agentName}" started`
      })
    } else if (evt.type === 'message_update') {
      allEvents.push({
        type: 'message_update',
        content: evt.content
      })
    } else if (evt.type === 'tool_start') {
      allEvents.push({
        type: 'tool_start',
        content: `Calling tool: ${evt.toolName}`
      })
    } else if (evt.type === 'tool_end') {
      allEvents.push({
        type: 'tool_end',
        content: `Tool ${evt.toolName} completed`
      })
    } else if (evt.type === 'delegation_start') {
      allEvents.push({
        type: 'delegation_start',
        content: `Delegating to agent ${evt.childAgentId}`
      })
    } else if (evt.type === 'task_completed') {
      allEvents.push({
        type: 'task_completed',
        content:
          typeof evt.output === 'string'
            ? evt.output
            : JSON.stringify(evt.output)
      })
    } else if (evt.type === 'task_failed') {
      allEvents.push({
        type: 'task_failed',
        content: evt.error
      })
    } else if (evt.type === 'escalation') {
      allEvents.push({
        type: 'escalation',
        content: evt.question
      })
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'agent_start':
        return <BotIcon className="h-3.5 w-3.5 text-blue-500" />
      case 'message_update':
        return <MessageSquareIcon className="text-foreground h-3.5 w-3.5" />
      case 'tool_start':
        return <WrenchIcon className="h-3.5 w-3.5 text-yellow-500" />
      case 'tool_end':
        return <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500" />
      case 'task_completed':
        return <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500" />
      case 'task_failed':
        return <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
      case 'delegation_start':
        return <Loader2Icon className="h-3.5 w-3.5 text-purple-500" />
      case 'escalation':
        return <MessageSquareIcon className="h-3.5 w-3.5 text-orange-500" />
      default:
        return <div className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Execution Timeline</h3>
          {taskDetail && (
            <p className="text-muted-foreground text-xs">
              {taskDetail.title} — {taskDetail.status}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {allEvents.length === 0 ? (
          <p className="text-muted-foreground text-center text-xs">
            No events yet.
          </p>
        ) : (
          <div className="space-y-3">
            {allEvents.map((evt, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{getIcon(evt.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-[10px] uppercase">
                    {evt.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs break-words whitespace-pre-wrap">
                    {evt.content.length > 500
                      ? evt.content.slice(0, 500) + '…'
                      : evt.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output section */}
      {taskDetail?.output && (
        <div className="border-t p-4">
          <h4 className="mb-1 text-xs font-semibold">Output</h4>
          <pre className="bg-muted max-h-40 overflow-auto rounded p-2 text-xs">
            {JSON.stringify(taskDetail.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
