import { AlertCircleIcon } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { reportRendererError } from '@/lib/report-error'

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

/** The one-line stand-in for a piece of a reply that could not be shown. */
export function RenderFailed({ what }: { what: string }) {
  const { t } = useTranslation('chat')
  return (
    <p
      role="alert"
      className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
    >
      <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden />
      {t('renderFailed', { what })}
    </p>
  )
}
