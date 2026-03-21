import { useEffect, useRef, useState } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type EllipsisTooltipProps = {
  text: string
  maxWidth?: number | string
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}

export function EllipsisTooltip({
  text,
  maxWidth = 240,
  className,
  side = 'top',
  delayDuration = 200
}: EllipsisTooltipProps) {
  const maxW =
    typeof maxWidth === 'number' ? `${maxWidth}px` : (maxWidth ?? '240px')

  const pRef = useRef<HTMLParagraphElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const el = pRef.current
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth)
    }
  }, [text, maxW])

  const paragraph = (
    <p
      ref={pRef}
      className={cn(
        'cursor-help truncate overflow-hidden text-ellipsis whitespace-nowrap',
        className
      )}
      style={{ maxWidth: maxW }}
      title={isTruncated ? text : undefined}
    >
      {text}
    </p>
  )

  if (!isTruncated) {
    return paragraph
  }

  return (
    <TooltipProvider delay={delayDuration}>
      <Tooltip>
        <TooltipTrigger>{paragraph}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-[80vw] wrap-break-word">
          <div className="leading-relaxed whitespace-pre-wrap">{text}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
