import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { ENTER_UP } from '@/lib/motion'
import { cn } from '@/lib/utils'

const TONES = {
  default: 'border-border/50 bg-background/70 text-muted-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive'
} as const

/**
 * A frosted strip over whatever is behind it, for a status the chat reports
 * in passing — context compaction above the composer, a memory change at the
 * foot of a reply. Rises in (`ENTER_UP`); `leaving` fades it out, for a
 * caller that keeps it mounted a moment after its state has gone.
 *
 * `details`, when given, sits under the icon + text row (the strip becomes a
 * column); without it the strip is that one row.
 */
export function StatusStrip({
  tone = 'default',
  icon,
  leaving = false,
  details,
  className,
  children,
  ...rest
}: {
  tone?: keyof typeof TONES
  icon: ReactNode
  leaving?: boolean
  details?: ReactNode
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
  const surface = cn(
    ENTER_UP,
    'rounded-xl border px-3 py-2 text-xs backdrop-blur-md',
    TONES[tone],
    leaving && 'opacity-0'
  )

  if (details === undefined) {
    return (
      <div
        {...rest}
        className={cn(surface, 'flex items-center gap-2', className)}
      >
        {icon}
        {children}
      </div>
    )
  }

  return (
    <div {...rest} className={cn(surface, 'flex flex-col', className)}>
      <div className="flex items-center gap-2">
        {icon}
        {children}
      </div>
      {details}
    </div>
  )
}
