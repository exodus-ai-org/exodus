import type { Attachment, ChatMessage, Usage } from '@shared/types/chat'
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
import { sileo } from 'sileo'

import { ChatStatus, UseChatHelpers } from '@/hooks/use-chat'
import { useUpload } from '@/hooks/use-upload'

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
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  // messages,
  // setMessages,
  sendMessage,
  lastUsage
}: {
  chatId: string
  input: string
  setInput: Dispatch<SetStateAction<string>>
  status: ChatStatus
  stop: () => void
  attachments: Attachment[]
  setAttachments: Dispatch<SetStateAction<Attachment[]>>
  messages: ChatMessage[]
  setMessages: UseChatHelpers['setMessages']
  sendMessage: UseChatHelpers['sendMessage']
  lastUsage?: Usage | null
}) {
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
    // event.preventDefault()

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
    window.history.replaceState({}, '', `/chat/${chatId}`)

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
    <div className="mx-auto mb-4 flex w-[calc(100%-8rem)] flex-col gap-2 rounded-xl border p-3 md:max-w-4xl">
      <form>
        <FilePreview />
        <Textarea
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          className="max-h-[75dvh] min-h-6 resize-none border-none bg-transparent! pb-6 shadow-none focus-visible:ring-0"
          rows={2}
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
      <div className="mx-2 mb-2 flex items-center justify-between">
        <div className="flex gap-2">
          <MultiModelInputUploader />
          <Separator orientation="vertical" className="h-6!" />
          <AdvancedTools />
          <AvailableMcpTools />
        </div>

        {status === 'submitted' || status === 'streaming' ? (
          <Button variant="secondary" onClick={stop}>
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
      {lastUsage && (
        <div className="text-muted-foreground mx-2 mb-1 flex gap-3 text-[11px]">
          <span>↑ {lastUsage.input.toLocaleString()} in</span>
          <span>↓ {lastUsage.output.toLocaleString()} out</span>
          <span>∑ {lastUsage.totalTokens.toLocaleString()} total</span>
          {lastUsage.cost.total > 0 && (
            <span>${lastUsage.cost.total.toFixed(4)}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(InputBox)
