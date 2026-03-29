import type { Attachment, ChatMessage, Usage } from '@shared/types/chat'
import { useAtom, useAtomValue } from 'jotai'
import { CircleStopIcon, SendIcon } from 'lucide-react'
import {
  ChangeEvent,
  ClipboardEvent,
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { useParams } from 'react-router'
import { sileo } from 'sileo'

import { UseChatHelpers } from '@/hooks/use-chat'
import { useUpload } from '@/hooks/use-upload'
import { cn } from '@/lib/utils'
import { chatInputAtom, chatStatusAtom, chatStopFnAtom } from '@/stores/input'

import { AdvancedTools } from './advanced-tools'
import { AudioRecorder } from './audio-recoder'
import { AvailableMcpTools } from './available-mcp-tools'
import { FilePreview } from './file-preview'
import { MultiModelInputUploader } from './multimodel-input-uploader'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Textarea } from './ui/textarea'

function InputBox({
  chatId,
  attachments,
  setAttachments,
  // messages,
  // setMessages,
  sendMessage,
  lastUsage
}: {
  chatId: string
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  messages: ChatMessage[]
  setMessages: UseChatHelpers['setMessages']
  sendMessage: UseChatHelpers['sendMessage']
  lastUsage?: Usage | null
}) {
  const [input, setInput] = useAtom(chatInputAtom)
  const status = useAtomValue(chatStatusAtom)
  const stop = useAtomValue(chatStopFnAtom)
  const { id } = useParams()
  const { uploadFile } = useUpload()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${
        textareaRef.current.scrollHeight + 2
      }px`
    }
  }

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
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
      attachments
    })

    setAttachments([])
    setInput('')
    resetHeight()
  }, [attachments, chatId, input, sendMessage, setAttachments, setInput])

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight()
    }
  }, [])

  return (
    <div
      className={cn(
        'mx-auto flex w-[calc(100%-8rem)] flex-col md:max-w-4xl',
        !id && 'mb-4'
      )}
    >
      <div className="focus-within:ring-ring/30 flex flex-col gap-1 rounded-xl border p-2 shadow-sm transition-shadow duration-200 focus-within:shadow-md focus-within:ring-1">
        <form>
          <FilePreview />
          <Textarea
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            className="max-h-[75dvh] min-h-16 resize-none border-none bg-transparent! py-1 shadow-none focus-visible:ring-0"
            rows={3}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()

                if (isTyping) {
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
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onPaste={handlePaste}
          />
        </form>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <MultiModelInputUploader />
            <Separator orientation="vertical" className="h-5!" />
            <AdvancedTools />
            <AvailableMcpTools />
          </div>

          {status === 'submitted' || status === 'streaming' ? (
            <Button variant="secondary" onClick={stop ?? undefined}>
              <CircleStopIcon />
            </Button>
          ) : (
            <>
              {input.trim() === '' ? (
                <AudioRecorder input={input} setInput={setInput} />
              ) : (
                <Button type="submit" variant="secondary" onClick={submitForm}>
                  <SendIcon />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {lastUsage && (
        <div className="text-muted-foreground flex justify-end gap-2 px-1 py-1 text-[10px]">
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
