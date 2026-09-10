import type { ChatMessage, Usage } from '@shared/types/chat'
import { useAtom, useAtomValue } from 'jotai'
import { ArrowUpIcon, CircleStopIcon } from 'lucide-react'
import {
  ChangeEvent,
  ClipboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef
} from 'react'
import { useParams } from 'react-router'
import { sileo } from 'sileo'

import { UseChatHelpers } from '@/hooks/use-chat'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import { chatInputAtom, chatStatusAtom, chatStopFnAtom } from '@/stores/input'

import { AudioRecorder } from './audio-recoder'
import { ActiveToolPills, ComposerToolsButton } from './composer-tools'
import { FilePreview } from './file-preview'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

function InputBox({
  chatId,
  // messages,
  // setMessages,
  sendMessage,
  lastUsage
}: {
  chatId: string
  messages: ChatMessage[]
  setMessages: UseChatHelpers['setMessages']
  sendMessage: UseChatHelpers['sendMessage']
  lastUsage?: Usage | null
}) {
  const [input, setInput] = useAtom(chatInputAtom)
  // Staged attachments live in `attachmentAtom` — the single source of truth
  // shared with `<FilePreview>` and `useUpload`. (This component used to take
  // its own `attachments` prop from `<Chat>`, which was never wired to the
  // atom: picked images showed in the preview but weren't sent and weren't
  // cleared on submit.)
  const [attachments, setAttachments] = useAtom(attachmentAtom)
  const status = useAtomValue(chatStatusAtom)
  const stop = useAtomValue(chatStopFnAtom)
  const { id } = useParams()
  const { uploadFile } = useUpload()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // isTyping tracks IME composition state; never shown on screen, so useRef
  // avoids the unnecessary re-render that useState would cause on each keystroke.
  const isTypingRef = useRef(false)

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    adjustHeight()
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData.items

    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    uploadFile(files)
  }

  const submitForm = useCallback(() => {
    // URL update is handled by Chat's onFinish to avoid interrupting the stream
    if (!id) {
      window.history.replaceState({}, '', `/chat/${chatId}`)
    }

    sendMessage({
      text: input,
      attachments: attachments ?? []
    })

    setAttachments(undefined)
    setInput('')
    // Inline reset so we don't add a recreated-each-render function to deps.
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [
    attachments,
    chatId,
    input,
    sendMessage,
    setAttachments,
    setInput,
    textareaRef
  ])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  return (
    <div
      className={cn(
        'mx-auto flex w-[calc(100%-8rem)] flex-col md:max-w-3xl',
        !id && 'mb-4'
      )}
    >
      <div className="border-border/60 bg-card focus-within:border-border/90 z-1 flex flex-col gap-1.5 rounded-[28px] border px-2.5 py-2 shadow-[0_2px_6px_rgb(0_0_0/0.04),0_10px_28px_rgb(0_0_0/0.06)] transition-colors">
        <FilePreview />
        <ActiveToolPills />
        <div className="flex items-end gap-1">
          <ComposerToolsButton />
          {/*
            Pin to 16px (matching the message body). The base Textarea is
            `text-base md:text-sm`, an iOS-zoom guard that's meaningless in
            Electron — it only made the composer text + line-height jump
            16↔14px / 24↔20px as the window crossed the `md` breakpoint.
          */}
          <Textarea
            ref={textareaRef}
            placeholder="Ask anything"
            value={input}
            onChange={handleInput}
            className="max-h-[45dvh] min-h-8 flex-1 resize-none border-none bg-transparent! px-1 py-1 text-base leading-6 shadow-none focus-visible:ring-0 md:text-base"
            rows={1}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()

                if (isTypingRef.current) {
                  return
                }

                if (status === 'streaming') {
                  sileo.warning({
                    title: 'Please wait',
                    description: 'The model is still generating a response.'
                  })
                } else {
                  submitForm()
                }
              }
            }}
            onCompositionStart={() => {
              isTypingRef.current = true
            }}
            onCompositionEnd={() => {
              isTypingRef.current = false
            }}
            onPaste={handlePaste}
          />

          {status === 'submitted' || status === 'streaming' ? (
            <Button
              aria-label="Stop"
              onClick={stop ?? undefined}
              className="bg-foreground text-background hover:bg-foreground/85 size-8 shrink-0 rounded-full [&_svg]:size-[18px]"
            >
              <CircleStopIcon />
            </Button>
          ) : input.trim() === '' ? (
            <AudioRecorder input={input} setInput={setInput} />
          ) : (
            <Button
              type="button"
              aria-label="Send"
              onClick={submitForm}
              className="bg-foreground text-background hover:bg-foreground/85 size-8 shrink-0 rounded-full [&_svg]:size-[18px]"
            >
              <ArrowUpIcon />
            </Button>
          )}
        </div>
      </div>
      {lastUsage && (
        <div className="text-muted-foreground/70 flex justify-end gap-2 px-1 py-1 text-[10px]">
          <span>↑{lastUsage.input.toLocaleString()}</span>
          <span>↓{lastUsage.output.toLocaleString()}</span>
          <span>∑{lastUsage.totalTokens.toLocaleString()}</span>
          {lastUsage.cost.total > 0 && (
            <span>${lastUsage.cost.total.toFixed(4)}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(InputBox)
