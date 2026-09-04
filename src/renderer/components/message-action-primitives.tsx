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
  children
}: {
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="text-muted-foreground hover:bg-secondary"
      onClick={onClick}
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
