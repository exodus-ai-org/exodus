import {
  AlertCircleIcon,
  BotIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  Loader2Icon,
  WrenchIcon,
  XCircleIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Markdown } from '@/components/markdown'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { getChildTasks, getTask } from '@/services/agent-x'
import type { AgentData, TaskData } from '@/stores/agent-x'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutionEvent {
  eventType: string
  payload: Record<string, unknown> | null
}

interface Execution {
  id: string
  agentId: string
  status: string
  tokenUsage?: { inputTokens: number; outputTokens: number } | null
  error?: string | null
  events: ExecutionEvent[]
}

interface TaskDetail extends TaskData {
  executions: Execution[]
}

interface ChildTaskRow extends TaskData {
  executionCount: number
  totalTokens: number
}

type ChatItem =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool'; name: string; result?: string }
  | { kind: 'error'; message: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChatItems(detail: TaskDetail): ChatItem[] {
  const items: ChatItem[] = []

  const desc = (detail.description ?? '').trim()
  if (desc) items.push({ kind: 'user', text: desc })

  for (const exec of detail.executions ?? []) {
    // Only show the last message_update (complete final text, not streaming chunks)
    const lastMsgUpdate = [...exec.events]
      .reverse()
      .find((e) => e.eventType === 'message_update')
    if (lastMsgUpdate) {
      const text = (lastMsgUpdate.payload?.content as string) ?? ''
      if (text) items.push({ kind: 'assistant', text })
    }
    for (const evt of exec.events) {
      if (evt.eventType === 'tool_end') {
        const name = (evt.payload?.toolName as string) ?? 'tool'
        const result = (evt.payload?.result as string) ?? ''
        items.push({ kind: 'tool', name, result })
      }
    }
    if (exec.error) {
      items.push({ kind: 'error', message: exec.error })
    }
  }

  return items
}

// ─── Bubble sub-components ────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-card border-border max-w-[85%] rounded-xl border px-4 py-3 text-sm">
        <Markdown src={text} />
      </div>
    </div>
  )
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="bg-muted max-w-[85%] rounded-xl px-4 py-3 text-sm">
        <Markdown src={text} />
      </div>
    </div>
  )
}

function ToolBubble({ name, result }: { name: string; result?: string }) {
  const PREVIEW = 100
  const isLong = (result?.length ?? 0) > PREVIEW

  return (
    <div className="flex justify-start">
      <div className="border-border bg-muted/40 max-w-[85%] rounded-xl border px-3 py-2 text-xs">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 font-medium">
          <WrenchIcon className="size-3.5" />
          <span>{name}</span>
          <CheckCircle2Icon className="size-3.5 text-green-600" />
        </div>
        {result &&
          (isLong ? (
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer select-none">
                {result.slice(0, PREVIEW)}…{' '}
                <span className="opacity-60 group-open:hidden">
                  ▸ Show more
                </span>
                <span className="hidden opacity-60 group-open:inline">
                  ▾ Hide
                </span>
              </summary>
              <pre className="mt-2 break-words whitespace-pre-wrap">
                {result}
              </pre>
            </details>
          ) : (
            <pre className="break-words whitespace-pre-wrap">{result}</pre>
          ))}
      </div>
    </div>
  )
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <div className="flex justify-start">
      <div className="border-destructive bg-destructive/10 text-destructive max-w-[85%] rounded-xl border px-3 py-2 text-xs">
        <div className="mb-1 flex items-center gap-1.5 font-medium">
          <XCircleIcon className="size-3.5" />
          Execution failed
        </div>
        <pre className="break-words whitespace-pre-wrap">{message}</pre>
      </div>
    </div>
  )
}

// ─── Cron run history ─────────────────────────────────────────────────────────

function CronRunHistory({ taskId }: { taskId: string }) {
  const [children, setChildren] = useState<ChildTaskRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getChildTasks(taskId)
      .then(setChildren)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [taskId])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        No runs yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y">
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-3 px-6 py-3">
          {child.status === 'completed' ? (
            <CheckIcon className="size-4 shrink-0 text-green-500" />
          ) : child.status === 'failed' ? (
            <AlertCircleIcon className="size-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2Icon className="text-muted-foreground size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">
              {child.completedAt
                ? new Date(child.completedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : new Date(child.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {child.status}
              {child.totalTokens > 0 &&
                ` · ${child.totalTokens.toLocaleString()} tokens`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

interface TaskLogSheetProps {
  taskId: string | null
  agents: AgentData[]
  onClose: () => void
}

export function TaskLogSheet({ taskId, agents, onClose }: TaskLogSheetProps) {
  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!taskId) {
      setDetail(null)
      return
    }
    setLoading(true)
    getTask(taskId)
      .then((t) => setDetail(t as unknown as TaskDetail))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [taskId])

  const isCronTemplate = !!detail?.cronExpression
  const items = detail && !isCronTemplate ? buildChatItems(detail) : []
  const agentName = detail?.assignedAgentId
    ? agents.find((a) => a.id === detail.assignedAgentId)?.name
    : null

  const totalTokens =
    detail?.executions?.reduce(
      (sum, e) =>
        sum +
        (e.tokenUsage?.inputTokens ?? 0) +
        (e.tokenUsage?.outputTokens ?? 0),
      0
    ) ?? 0

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base leading-snug">
            {detail?.title ?? 'Task Log'}
          </SheetTitle>
          {isCronTemplate ? (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarClockIcon className="size-3" />
              <span className="font-mono">{detail?.cronExpression}</span>
            </p>
          ) : agentName ? (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <BotIcon className="size-3" />
              {agentName}
            </p>
          ) : null}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : isCronTemplate && taskId ? (
            <CronRunHistory taskId={taskId} />
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center px-6 py-5 text-sm">
              No execution logs yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-6 py-5">
              {items.map((item, i) => {
                if (item.kind === 'user')
                  return <UserBubble key={i} text={item.text} />
                if (item.kind === 'assistant')
                  return <AssistantBubble key={i} text={item.text} />
                if (item.kind === 'tool')
                  return (
                    <ToolBubble key={i} name={item.name} result={item.result} />
                  )
                if (item.kind === 'error')
                  return <ErrorBubble key={i} message={item.message} />
                return null
              })}
            </div>
          )}
        </div>

        {/* Footer: token stats (one-time tasks only) */}
        {!isCronTemplate && totalTokens > 0 && (
          <div className="text-muted-foreground border-t px-6 py-3 text-xs">
            {totalTokens.toLocaleString()} tokens
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
