import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** skills.sh-style column/section label: small, mono, tracked, muted. */
export function SectionLabel({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h3
      className={cn(
        'text-muted-foreground font-mono text-[11px] font-medium tracking-[0.12em] uppercase',
        className
      )}
    >
      {children}
    </h3>
  )
}
