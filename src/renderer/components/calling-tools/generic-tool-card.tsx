import { capitalCase } from 'change-case'
import { ChevronRightIcon, WrenchIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Fallback card for tool results we don't have a dedicated renderer for —
 * primarily MCP tools (drawio, github, slack, …) whose names aren't in the
 * built-in dispatch list. Without this the tool appears to "do nothing" in
 * the UI, even though the LLM saw the result. We show the tool name and let
 * the user expand to inspect the raw payload.
 */
export function GenericToolCard({
  toolName,
  output
}: {
  toolName: string
  output: unknown
}) {
  const [open, setOpen] = useState(false)
  const label = toolName ? capitalCase(toolName) : 'Tool'

  const pretty =
    typeof output === 'string'
      ? output
      : output == null
        ? ''
        : (() => {
            try {
              return JSON.stringify(output, null, 2)
            } catch {
              return String(output)
            }
          })()

  return (
    <div className="bg-card overflow-hidden rounded-lg border text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-accent/40 flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <WrenchIcon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="font-medium">{label}</span>
        <Badge variant="secondary" className="text-[10px]">
          tool
        </Badge>
        <ChevronRightIcon
          className={cn(
            'text-muted-foreground ml-auto size-3.5 shrink-0 transition-transform',
            open && 'rotate-90'
          )}
        />
      </button>
      {open && pretty && (
        <pre className="bg-muted/30 max-h-72 overflow-auto border-t px-3 py-2 font-mono text-[11px] leading-snug whitespace-pre-wrap">
          {pretty}
        </pre>
      )}
    </div>
  )
}
