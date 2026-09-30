/**
 * Shared atomic UI pieces used by both audio-player and massage-action.
 * Extracted into a third module to break the circular import cycle:
 *   audio-player ↔ massage-action (react-doctor/circular-dependency)
 */
import { ReactNode } from 'react'

import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function IconWrapper({
  onClick,
  label,
  testId,
  children
}: {
  onClick?: () => void
  /** The button's name for a screen reader: the icon alone says nothing. */
  label?: string
  testId?: string
  children: ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg [&_svg]:size-4"
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
    >
      {children}
    </Button>
  )
}

export function MessageActionItem({
  children,
  tooltipContent
}: {
  children: ReactNode
  tooltipContent: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
  )
}
