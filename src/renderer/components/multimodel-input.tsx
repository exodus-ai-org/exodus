import { useArtifact } from '@/hooks/use-artifact'
import { cn } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import { UseChatHelpers } from '@ai-sdk/react'
import { useAtom } from 'jotai'
import { CircleStop, Send } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AudioRecorder } from './audio-recoder'
import { FilePreview } from './file-preview'
import { MultiModelInputTools } from './multimodel-input-tools'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const { show: showArtifactSheet } = useArtifact()

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

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    adjustHeight()
  }

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`)
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
    <div
      className={cn(
        'border-input mx-auto mb-4 flex w-full flex-col gap-2 rounded-2xl border p-1 shadow-sm md:max-w-3xl',
        { ['mx-0 ml-4 w-[23rem]']: showArtifactSheet }
      )}
    >
      <form>
        <FilePreview />
        <Textarea
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          className="max-h-[calc(75dvh)] min-h-[24px] resize-none rounded-2xl border-none pb-6 shadow-none focus-visible:ring-0"
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
        />
      </form>
      <div className="mx-2 mb-2 flex justify-between">
        <div className="flex gap-2">
          <MultiModelInputUploader />
          <MultiModelInputTools />
        </div>

        {status === 'streaming' ? (
          <Button variant="ghost" onClick={stop}>
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
