import type { LucideIcon } from 'lucide-react'
import type React from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

/**
 * The pieces every Settings page is put together from, on top of
 * `SettingsSection` / `SettingsRow` (settings-row.tsx). A page reads top to
 * bottom: an intro or a notice, the primary action, the content sections, and
 * anything destructive last, in a section of its own.
 */

// ─── Motion ───────────────────────────────────────────────────────────────────

// How things arrive: a short fade (up) on a strong ease-out. `starting:`
// (@starting-style) needs no mount effect, and being a transition rather than
// a keyframe it never restarts from zero. Only for what appears occasionally —
// a page, a list row, a panel; never on a switch, a select or anything typed.
export const ENTER =
  'transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:opacity-0'
export const ENTER_UP = `${ENTER} starting:translate-y-1.5`
// A whole page swapping in on a tab change: seen far more often than a row, so
// shorter and barely moving — enough that the swap is not a hard cut.
export const PAGE_ENTER =
  'transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-1 starting:opacity-0'

const STAGGER_MS = 40
// A long list staggered all the way down would still be arriving a second
// later; past this many items the rest come in together.
const STAGGER_CAP = 6

/** `style` for the `index`-th of a few items entering together. */
export function staggerDelay(index: number): React.CSSProperties {
  return { transitionDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` }
}

// ─── Building blocks ──────────────────────────────────────────────────────────

export function IconTile({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5',
        className
      )}
    >
      {children}
    </div>
  )
}

/** The number of a step in a short procedure — pairing, a quick start. */
export function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
    >
      {children}
    </span>
  )
}

/**
 * What the page is for, in muted prose under its title — possibly several
 * sentences, bold phrases, `code`, a link, a list. Explanation is not a
 * warning, so it gets no box; `SettingsNotice` is for the caveat that is.
 */
export function SettingsIntro({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground [&_strong]:text-foreground -mt-4 flex flex-col gap-2 text-sm leading-relaxed text-pretty [&_a]:underline [&_a]:underline-offset-4 [&_code]:font-mono [&_code]:text-[13px] [&_strong]:font-medium [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-4',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * A caveat the user has to heed for the thing in front of them to work (a
 * step's precondition, a missing key) — an `Alert`. Not for describing a page.
 */
export function SettingsNotice({
  icon: Icon,
  className,
  style,
  children
}: {
  icon: LucideIcon
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <Alert className={className} style={style}>
      <Icon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

/**
 * An empty list, as the one child of a `SettingsSection` card (the wrapper
 * takes the card's row padding, so `Empty` keeps its own).
 */
export function SettingsEmpty({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div>
      <Empty className="p-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle className="text-base">{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {children}
      </Empty>
    </div>
  )
}

/**
 * A thing in a list — a device, a server, a backup: icon tile, a name, one
 * line of what is worth knowing about it, and its actions on the right. Also
 * the shape of a page's primary action ("Connect an iPhone or iPad").
 */
export function SettingsItem({
  icon,
  title,
  description,
  actions,
  className,
  style,
  children,
  ...props
}: {
  /** Only when it means something (a device, a server) — never a decoration. */
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
} & Omit<React.ComponentProps<'div'>, 'title'>) {
  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      style={style}
      {...props}
    >
      <div className="flex items-center gap-3.5">
        {icon && <IconTile>{icon}</IconTile>}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {title}
          </div>
          {description && (
            <div className="text-muted-foreground min-w-0 text-sm">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * A button label that changes with state ("Copy link" → "Copied"). Every label
 * shares one grid cell, so the button keeps the widest one's width (nothing
 * beside it jumps) and the swap is a crossfade — the blur hides the moment two
 * are on screen.
 */
export function SwapLabel({
  active,
  labels
}: {
  active: string
  labels: Record<string, React.ReactNode>
}) {
  return (
    <span className="grid *:col-start-1 *:row-start-1 *:flex *:items-center *:justify-center *:gap-1.5 *:transition-[opacity,filter] *:duration-200">
      {Object.entries(labels).map(([key, label]) => (
        <span
          key={key}
          aria-hidden={key !== active}
          className={cn(key !== active && 'opacity-0 blur-[2px]')}
        >
          {label}
        </span>
      ))}
    </span>
  )
}
