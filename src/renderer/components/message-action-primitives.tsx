/**
 * Shared atomic UI pieces used by both audio-player and massage-action.
 * Extracted into a third module to break the circular import cycle:
 *   audio-player ↔ massage-action (react-doctor/circular-dependency)
 */
import { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function IconWrapper({
  onClick,
  children
}: {
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="hover:bg-secondary text-muted-foreground flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors duration-150"
      onClick={onClick}
    >
      {children}
    </button>
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
