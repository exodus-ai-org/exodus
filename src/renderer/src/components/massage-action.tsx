import { TooltipArrow } from '@radix-ui/react-tooltip'
import {
  Check,
  Copy,
  PencilRuler,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
  Volume2
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

const iconProps = {
  size: 14,
  className:
    'text-muted-foreground cursor-pointer rounded-sm p-1.5 hover:bg-secondary p-1 box-content'
}

function MessageActionItem({
  children,
  tooltipContent
}: {
  children: ReactNode
  tooltipContent: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
          <TooltipArrow className="TooltipArrow" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function MessageAction() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!copied) {
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  return (
    <div className="invisible absolute flex gap-0.5 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-hover:transition-all">
      <MessageActionItem tooltipContent="Copy">
        {!copied ? (
          <Copy {...iconProps} onClick={handleCopy} />
        ) : (
          <Check {...iconProps} />
        )}
      </MessageActionItem>
      <MessageActionItem tooltipContent="Good response">
        <ThumbsUp {...iconProps} />
      </MessageActionItem>
      <MessageActionItem tooltipContent="Bad response">
        <ThumbsDown {...iconProps} />
      </MessageActionItem>
      <MessageActionItem tooltipContent="Read aloud">
        <Volume2 {...iconProps} />
      </MessageActionItem>
      <MessageActionItem tooltipContent="Edit in canvas">
        <PencilRuler {...iconProps} />
      </MessageActionItem>
      <MessageActionItem tooltipContent="Switch model">
        <RefreshCcw {...iconProps} />
      </MessageActionItem>
    </div>
  )
}
