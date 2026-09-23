import { AlertCircleIcon } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ROW_ENTER } from '@/lib/motion'
import { reportRendererError } from '@/lib/report-error'
import { cn } from '@/lib/utils'

/**
 * Contains a render failure to the piece that failed. Without it, one tool
 * card reading a field its result did not carry took the whole chat page
 * down to the route's "Something went wrong" — the reply had streamed and
 * persisted fine. The error is reported to the main-process log under
 * `renderer/<scope>` with `attributes`, and the fallback stands in.
 */
export class ErrorBoundary extends Component<
  {
    scope: string
    attributes?: Record<string, unknown>
    fallback: ReactNode | ((error: Error) => ReactNode)
    children: ReactNode
  },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    reportRendererError(this.props.scope, error, this.props.attributes)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const { fallback } = this.props
    return typeof fallback === 'function' ? fallback(error) : fallback
  }
}

/**
 * The stand-in for a piece of a reply that could not be shown — our bug,
 * not the tool's, so it reads as a quiet system notice (the
 * `border-border/50 bg-background/70` language `lcm-status-card.tsx` uses
 * for "nothing to act on here"), never as the tool-failure box
 * (`border-destructive/30 bg-destructive/10`, `messages-calling-tools.tsx`)
 * — that one says the tool itself came back with an error.
 */
export function RenderFailed({ what }: { what: string }) {
  const { t } = useTranslation('chat')
  return (
    <div
      role="alert"
      className={cn(
        ROW_ENTER,
        'border-border/50 bg-background/70 text-muted-foreground mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm backdrop-blur-md'
      )}
    >
      <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden />
      {t('renderFailed', { what })}
    </div>
  )
}
