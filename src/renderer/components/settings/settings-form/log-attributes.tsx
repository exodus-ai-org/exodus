import { useTranslation } from 'react-i18next'

// Where a record keeps its stack: the logger's own errors under
// `exception.stacktrace`, a report from the renderer (or a main-process line
// written before stacks moved there) under `stack`. The first one present is
// the one shown.
const STACK_ATTRIBUTES = ['exception.stacktrace', 'stack'] as const
const COMPONENT_STACK_ATTRIBUTE = 'componentStack'

export interface LogStacks {
  stack?: string
  componentStack?: string
  /** Every attribute that is not shown as a stack. */
  rest: Record<string, unknown>
}

const isStack = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

/**
 * A record's attributes, split into the stacks that are shown as blocks of
 * their own and everything else. The stack as it was thrown
 * (`…stacktrace_raw`, `stack_raw`) stays with the rest: it is there to be
 * found, not to be read first.
 */
export function splitLogStacks(
  attributes: Record<string, unknown> | undefined
): LogStacks {
  const rest = { ...attributes }
  const split: LogStacks = { rest }
  for (const name of STACK_ATTRIBUTES) {
    const value = rest[name]
    if (!isStack(value)) continue
    split.stack = value
    delete rest[name]
    break
  }
  const componentStack = rest[COMPONENT_STACK_ATTRIBUTE]
  if (isStack(componentStack)) {
    split.componentStack = componentStack
    delete rest[COMPONENT_STACK_ATTRIBUTE]
  }
  return split
}

function StackBlock({
  kind,
  label,
  text
}: {
  kind: 'stack' | 'componentStack'
  label: string
  text: string
}) {
  return (
    <div data-log-stack={kind} className="space-y-1">
      <div
        data-log-stack-label
        className="text-muted-foreground text-[11px] font-medium"
      >
        {label}
      </div>
      {/* `whitespace-pre`, not `pre-wrap`: a frame is one line, and a wrapped
          one reads as two. The block scrolls both ways instead. */}
      <pre className="border-border/50 bg-background/70 text-foreground/80 max-h-[240px] overflow-auto rounded-md border px-2.5 py-2 font-mono text-[11px] leading-relaxed whitespace-pre select-text">
        {text}
      </pre>
    </div>
  )
}

/**
 * The attributes of an expanded row in Settings → Logger. A stack inside the
 * JSON is one long string with `\n` in it; here it is a block of its own, as
 * text, above the JSON of whatever else the record carries.
 */
export function LogAttributes({
  attributes
}: {
  attributes: Record<string, unknown> | undefined
}) {
  const { t } = useTranslation('settings')
  const { stack, componentStack, rest } = splitLogStacks(attributes)
  return (
    <>
      {stack && (
        <StackBlock
          kind="stack"
          label={t('logger.details.stack')}
          text={stack}
        />
      )}
      {componentStack && (
        <StackBlock
          kind="componentStack"
          label={t('logger.details.componentStack')}
          // React opens a component stack with a line break; the indent of
          // its first frame stays.
          text={componentStack.replace(/^\n+/u, '').trimEnd()}
        />
      )}
      {Object.keys(rest).length > 0 && (
        <pre
          data-log-attributes
          className="text-muted-foreground max-h-[240px] overflow-auto text-xs whitespace-pre-wrap"
        >
          {JSON.stringify(rest, null, 2)}
        </pre>
      )}
    </>
  )
}
