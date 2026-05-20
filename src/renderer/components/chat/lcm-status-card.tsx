import { CheckIcon, TriangleAlertIcon } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { useLcmStatus } from '@/hooks/use-lcm-status'
import { cn } from '@/lib/utils'

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function LcmStatusCard({ chatId }: { chatId: string }) {
  const state = useLcmStatus(chatId)

  if (state.kind === 'idle') return null

  const baseClass =
    'mx-4 my-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs'

  if (state.kind === 'running') {
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <Spinner className="size-3.5" />
        <span>Compacting conversation history…</span>
      </div>
    )
  }

  if (state.kind === 'just_completed') {
    const { messagesBefore, messagesAfter, tokensSaved } = state.payload
    const compacted = Math.max(0, messagesBefore - messagesAfter)
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <CheckIcon className="size-3.5" />
        <span>
          Compacted {compacted} message{compacted === 1 ? '' : 's'} · saved ~
          {formatTokens(tokensSaved)} tokens
        </span>
      </div>
    )
  }

  // error
  return (
    <div
      className={cn(
        baseClass,
        'border-destructive/40 text-destructive border bg-transparent'
      )}
    >
      <TriangleAlertIcon className="size-3.5" />
      <span>Compaction failed (will retry next turn)</span>
    </div>
  )
}
