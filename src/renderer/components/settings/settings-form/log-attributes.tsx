import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

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

/** A section of the detail sheet: a small uppercase heading, then its body. */
export function LogSection({
  label,
  count,
  children,
  className
}: {
  label: string
  count?: number
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-1.5', className)}>
      <h3
        data-log-section-label
        className="text-muted-foreground text-2xs flex items-center gap-1.5 font-medium tracking-wide uppercase"
      >
        {label}
        {count !== undefined && (
          <span className="bg-muted text-2xs rounded px-1 font-mono tabular-nums">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  )
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
    <div data-log-stack={kind} className="space-y-1.5">
      <div
        data-log-stack-label
        className="text-muted-foreground text-2xs font-medium tracking-wide uppercase"
      >
        {label}
      </div>
      {/* `whitespace-pre`, not `pre-wrap`: a frame is one line, and a wrapped
          one reads as two. The block scrolls both ways instead. */}
      <pre className="border-border/60 bg-muted/40 text-foreground/80 text-2xs max-h-[240px] overflow-auto rounded-lg border px-3 py-2 font-mono leading-relaxed whitespace-pre select-text">
        {text}
      </pre>
    </div>
  )
}

/**
 * A note after a value, the way the reference writes one: `// 5.0 s` after a
 * duration in milliseconds. Only for what a name says is milliseconds.
 */
export function valueNote(key: string, value: unknown): string | null {
  if (!/(?:^|[._])(?:ms|\w+_ms)$|[a-z]Ms$/u.test(key)) return null
  const ms = typeof value === 'string' ? Number(value) : value
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 1000) return null
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${(ms / 60_000).toFixed(1)} min`
}

function AttributeValue({ value }: { value: unknown }) {
  if (value !== null && typeof value === 'object') {
    return (
      <pre className="text-2xs max-h-[200px] overflow-auto font-mono whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  // A string shows its quotes, a number or a boolean does not: the type is
  // part of what a field says.
  return (
    <span className="break-all whitespace-pre-wrap">
      {typeof value === 'string' ? JSON.stringify(value) : String(value)}
    </span>
  )
}

/** `http.status_code` → a dimmed `http.` and the name itself. */
function AttributeKey({ name }: { name: string }) {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return <>{name}</>
  return (
    <>
      <span className="text-muted-foreground/60">{name.slice(0, dot + 1)}</span>
      {name.slice(dot + 1)}
    </>
  )
}

export interface LogTableRow {
  key: string
  value: ReactNode
  note?: ReactNode
  /** The note in the level's colour (a severity), not muted. */
  noteClassName?: string
}

/** Two columns of key and value, hairlines between rows, mono throughout. */
export function LogTable({
  rows,
  dim,
  ...props
}: {
  rows: LogTableRow[]
  /** Quieter, for what describes the process rather than the line. */
  dim?: boolean
} & ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'divide-border/60 overflow-hidden rounded-lg border font-mono text-2xs',
        'divide-y',
        dim && 'opacity-70'
      )}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          data-log-attribute={row.key}
          className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)]"
        >
          <div className="bg-muted/40 text-muted-foreground truncate px-3 py-1.5">
            <AttributeKey name={row.key} />
          </div>
          <div className="min-w-0 px-3 py-1.5 select-text">
            {row.value}
            {row.note && (
              <span
                className={cn('text-muted-foreground ml-2', row.noteClassName)}
              >
                {'// '}
                {row.note}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The rows of an attributes object, sorted by key. */
export function attributeRows(
  attributes: Record<string, unknown>
): LogTableRow[] {
  return Object.keys(attributes)
    .toSorted((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      value: <AttributeValue value={attributes[key]} />,
      note: valueNote(key, attributes[key]) ?? undefined
    }))
}

/**
 * The attributes of a line in Settings → Logger's detail sheet. A stack is a
 * block of its own, as text with real line breaks; whatever else the record
 * carries is a key/value table under it.
 */
export function LogAttributes({
  attributes
}: {
  attributes: Record<string, unknown> | undefined
}) {
  const { t } = useTranslation('settings')
  const { stack, componentStack, rest } = splitLogStacks(attributes)
  const count = Object.keys(rest).length
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
      {count > 0 && (
        <LogSection label={t('logger.details.attributes')} count={count}>
          <LogTable data-log-attributes rows={attributeRows(rest)} />
        </LogSection>
      )}
    </>
  )
}
