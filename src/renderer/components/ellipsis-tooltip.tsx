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
    // False positive for react-doctor/no-adjust-state-on-prop-change: this is a
    // DOM-measurement effect, not a prop-to-state copy. el.scrollWidth /
    // el.clientWidth are only available post-render; there is no synchronous
    // way to determine truncation without reading the live DOM node.
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- DOM measurement, not a prop copy
    setIsTruncated(el ? el.scrollWidth > el.clientWidth : false)
  }, [text, maxW])

  const paragraph = (
    <p
      ref={pRef}
      className={cn('cursor-help truncate', className)}
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
