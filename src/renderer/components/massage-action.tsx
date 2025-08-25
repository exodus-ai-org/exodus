import { useClipboard } from '@/hooks/use-clipboard'
import { useImmersion } from '@/hooks/use-immersion'
import { UseChatHelpers } from '@ai-sdk/react'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { ChatMessage } from '@shared/types/message'
import {
  Check,
  Copy,
  PencilRuler,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react'
import { ReactNode } from 'react'
import AudioPlayer from './audio-player'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function IconWrapper({
  onClick,
  children
}: {
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <span
      className="hover:bg-secondary text-muted-foreground flex h-6 w-6 items-center justify-center rounded-sm"
      onClick={onClick}
    >
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

export function MessageAction({
  content,
  regenerate
}: {
  content: string
  regenerate: UseChatHelpers<ChatMessage>['regenerate']
}) {
  const { copied, handleCopy } = useClipboard()
  const { openImmersion } = useImmersion()

  return (
    <div className="flex gap-0.5">
      <MessageActionItem tooltipContent="Copy">
        <IconWrapper onClick={() => handleCopy(content)}>
          {copied !== content ? (
            <Copy size={14} strokeWidth={2.5} />
          ) : (
            <Check size={14} strokeWidth={2.5} />
          )}
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Good response">
        <IconWrapper onClick={() => {}}>
          <ThumbsUp size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Bad response">
        <IconWrapper onClick={() => {}}>
          <ThumbsDown size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <AudioPlayer content={content} />
      <MessageActionItem tooltipContent="Edit in Immersion">
        <IconWrapper onClick={() => openImmersion(content)}>
          <PencilRuler size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Switch model">
        <IconWrapper onClick={regenerate}>
          <RefreshCcw size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
    </div>
  )
}
