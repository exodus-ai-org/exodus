import { TooltipArrow } from '@radix-ui/react-tooltip'
import {
  Check,
  Copy,
  PencilRuler,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react'
import { ReactNode, useState } from 'react'
import AudioPlayer from './audio-player'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function IconWrapper({ children }: { children: ReactNode }) {
  return (
    <span className="hover:bg-secondary text-muted-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm">
      {children}
    </span>
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
          <TooltipArrow className="TooltipArrow" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function MessageAction({ content }: { content: string }) {
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
        <IconWrapper>
          {!copied ? (
            <Copy size={14} strokeWidth={2.5} onClick={handleCopy} />
          ) : (
            <Check size={14} strokeWidth={2.5} />
          )}
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Good response">
        <IconWrapper>
          <ThumbsUp size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Bad response">
        <IconWrapper>
          <ThumbsDown size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <AudioPlayer content={content} />
      <MessageActionItem tooltipContent="Edit in canvas">
        <IconWrapper>
          <PencilRuler size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Switch model">
        <IconWrapper>
          <RefreshCcw size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
    </div>
  )
}
