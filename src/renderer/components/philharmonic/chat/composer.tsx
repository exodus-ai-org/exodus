// src/renderer/components/philharmonic/chat/composer.tsx
import type { Attachment } from '@shared/types/chat'
import { useAtom } from 'jotai'
import { SendIcon, SquareIcon } from 'lucide-react'
import { type ClipboardEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { usePhilharmonicUpload } from '@/hooks/use-philharmonic-upload'
import { philharmonicAttachmentAtom } from '@/stores/philharmonic'

import { AttachmentPreview } from './attachment-preview'
import { ComposerUploader } from './uploader'

export function Composer({
  onSend,
  disabled,
  busy = false,
  onStop
}: {
  onSend: (text: string, attachments: Attachment[]) => void
  disabled?: boolean
  /** PM is currently running — the Send button becomes a Stop button. */
  busy?: boolean
  onStop?: () => void
}) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useAtom(philharmonicAttachmentAtom)
  const { upload } = usePhilharmonicUpload()

  const submit = () => {
    const t = text.trim()
    if (!t && attachments.length === 0) return
    onSend(t, attachments)
    setText('')
    setAttachments([])
  }
  const canSend =
    !disabled && (text.trim().length > 0 || attachments.length > 0)

  const onPaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      await upload(files)
    }
  }

  return (
    <div className="bg-muted border-border border-t px-4 pt-3 pb-4">
      <div className="border-border bg-card focus-within:border-primary focus-within:ring-accent flex flex-col gap-1 rounded-xl border p-2 pl-3.5 transition-shadow focus-within:ring-[3px]">
        <AttachmentPreview />
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            onPaste={onPaste}
            placeholder="Message your team…"
            className="max-h-48 min-h-[36px] resize-none border-0 bg-transparent p-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <ComposerUploader />
          {busy ? (
            <Button
              size="icon-sm"
              variant="destructive"
              onClick={onStop}
              aria-label="Stop"
              className="shrink-0 rounded-lg"
            >
              <SquareIcon className="h-3 w-3 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send"
              className="shrink-0 rounded-lg"
            >
              <SendIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground mt-1.5 px-1 text-[10px]">
        Press <kbd className="bg-background rounded px-1 py-px">Enter</kbd> to
        send,{' '}
        <kbd className="bg-background ml-1 rounded px-1 py-px">
          Shift + Enter
        </kbd>{' '}
        for a new line. Paste or attach images.
      </p>
    </div>
  )
}
