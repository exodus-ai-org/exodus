import { CheckCircle2Icon, TerminalIcon, XCircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface TerminalResult {
  command: string
  cwd: string
  exitCode: number
  stdout: string
  stderr: string
}

export function TerminalCard({ toolResult }: { toolResult: TerminalResult }) {
  const success = toolResult.exitCode === 0
  const hasOutput = toolResult.stdout.length > 0
  const hasError = toolResult.stderr.length > 0

  return (
    <div className="overflow-hidden rounded-lg border font-mono text-xs">
      {/* Header */}
      <div className="bg-muted/60 flex items-center gap-2 border-b px-3 py-2">
        <TerminalIcon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-foreground/80 flex-1 truncate">
          {toolResult.command}
        </span>
        {success ? (
          <CheckCircle2Icon className="size-3.5 shrink-0 text-green-500" />
        ) : (
          <XCircleIcon className="text-destructive size-3.5 shrink-0" />
        )}
        <span
          className={cn(
            'shrink-0',
            success ? 'text-green-500' : 'text-destructive'
          )}
        >
          exit {toolResult.exitCode}
        </span>
      </div>

      {/* stdout */}
      {hasOutput && (
        <pre className="text-foreground/90 max-h-64 overflow-auto bg-transparent px-3 py-2 leading-relaxed break-all whitespace-pre-wrap">
          {toolResult.stdout}
        </pre>
      )}

      {/* stderr */}
      {hasError && (
        <pre
          className={cn(
            'max-h-40 overflow-auto px-3 py-2 leading-relaxed break-all whitespace-pre-wrap',
            hasOutput ? 'border-t' : '',
            success
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-destructive'
          )}
        >
          {toolResult.stderr}
        </pre>
      )}

      {/* empty output */}
      {!hasOutput && !hasError && (
        <div className="text-muted-foreground px-3 py-2 italic">No output</div>
      )}

      {/* cwd hint */}
      <div className="text-muted-foreground/60 border-t px-3 py-1.5 text-[10px]">
        {toolResult.cwd}
      </div>
    </div>
  )
}
