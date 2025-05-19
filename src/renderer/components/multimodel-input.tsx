import { useUpload } from '@/hooks/use-upload'
import { attachmentAtom } from '@/stores/chat'
import { UseChatHelpers } from '@ai-sdk/react'
import { useAtom } from 'jotai'
import { CircleStop, Send } from 'lucide-react'
import {
  ChangeEvent,
  ClipboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { toast } from 'sonner'
import { AdvancedTools as AdvancedToolsType } from './advanced-tools'
import { AudioRecorder } from './audio-recoder'
import { AvailableMcpTools } from './available-mcp-tools'
import { FilePreview } from './file-preview'
import { MultiModelInputUploader } from './multimodel-input-uploader'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

function InputBox({
  chatId,
  input,
  setInput,
  handleSubmit,
  status
}: {
  chatId: string
  input: string
  append: UseChatHelpers['append']
  messages: UseChatHelpers['messages']
  setMessages: UseChatHelpers['setMessages']
  setInput: UseChatHelpers['setInput']
  handleSubmit: UseChatHelpers['handleSubmit']
  status: UseChatHelpers['status']
  stop: UseChatHelpers['stop']
}) {
  const [attachments, setAttachments] = useAtom(attachmentAtom)
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
    window.history.replaceState({}, '', `/#/chat/${chatId}`)
    handleSubmit(undefined, { experimental_attachments: attachments })
    setAttachments(undefined)
    resetHeight()
  }, [chatId, handleSubmit, attachments, setAttachments])

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight()
    }
  }, [])

  return (
    <div className="border-input mx-auto mb-4 flex w-[calc(100%-2rem)] flex-col gap-2 rounded-2xl border p-1 shadow-sm md:max-w-3xl">
      <form>
        <FilePreview />
        <Textarea
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          className="max-h-[75dvh] min-h-[24px] resize-none rounded-2xl border-none pb-6 shadow-none focus-visible:ring-0"
          rows={2}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()

              if (isTyping) {
                return
              }

              if (status === 'streaming') {
                toast.error('Please wait for the model to finish its response!')
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
      <div className="mx-2 mb-2 flex justify-between">
        <div className="flex gap-2">
          <MultiModelInputUploader />
          <AdvancedToolsType />
          <AvailableMcpTools />
        </div>

        {status === 'submitted' || status === 'streaming' ? (
          <Button variant="secondary" onClick={stop}>
            <CircleStop />
          </Button>
        ) : (
          <>
            {input.trim() === '' ? (
              <AudioRecorder input={input} setInput={setInput} />
            ) : (
              <Button
                type="submit"
                variant="secondary"
                className="cursor-pointer"
                onClick={handleSubmit}
              >
                <Send />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default memo(InputBox)
