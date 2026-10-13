import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A control of the title bar: an icon button with its name in a tooltip,
 * `no-drag` since the bar around it is the window's drag region. Shared by
 * the history arrows and the header's panel toggle.
 */
export function HeaderButton({
  label,
  icon,
  disabled,
  pressed,
  onClick,
  testId
}: {
  label: string
  icon: IconSvgElement
  disabled?: boolean
  pressed?: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'no-drag text-muted-foreground hover:text-foreground',
              pressed && 'bg-accent text-foreground'
            )}
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            data-testid={testId}
          />
        }
      >
        <HugeiconsIcon icon={icon} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
