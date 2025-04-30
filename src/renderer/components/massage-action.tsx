import { useArtifact } from '@/hooks/use-artifact'
import { useClipboard } from '@/hooks/use-clipboard'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { ChatRequestOptions } from 'ai'
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
      className="hover:bg-secondary text-muted-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm"
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
  reload
}: {
  content: string
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>
}) {
  const { copied, handleCopy } = useClipboard()
  const { openArtifact } = useArtifact()

  return (
    <div className="invisible absolute flex gap-0.5 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-hover:transition-all">
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
      <MessageActionItem tooltipContent="Edit in artifacts">
        <IconWrapper onClick={openArtifact}>
          <PencilRuler size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
      <MessageActionItem tooltipContent="Switch model">
        <IconWrapper onClick={reload}>
          <RefreshCcw size={14} strokeWidth={2.5} />
        </IconWrapper>
      </MessageActionItem>
    </div>
  )
}
