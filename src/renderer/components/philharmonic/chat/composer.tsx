// src/renderer/components/philharmonic/chat/composer.tsx
import type { Attachment } from '@shared/types/chat'
import { useAtom } from 'jotai'
import { SendIcon } from 'lucide-react'
import { type ClipboardEvent, useState } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { usePhilharmonicUpload } from '@/hooks/use-philharmonic-upload'
import { cn } from '@/lib/utils'
import { philharmonicAttachmentAtom } from '@/stores/philharmonic'

import { AttachmentPreview } from './attachment-preview'
import { ComposerUploader } from './uploader'

export function Composer({
  onSend,
  disabled
}: {
  onSend: (text: string, attachments: Attachment[]) => void
  disabled?: boolean
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
    <div
      className="px-4 pt-3 pb-4"
      style={{
        background: 'var(--ph-surface-sunken)',
        borderTop: '1px solid var(--ph-border)'
      }}
    >
      <div
        className={cn(
          'flex flex-col gap-1 rounded-[var(--ph-radius-xl)] border bg-[var(--ph-surface)] p-2 pl-3.5 transition-shadow',
          'focus-within:border-[var(--ph-primary)] focus-within:ring-[3px] focus-within:ring-[var(--ph-primary-soft)]'
        )}
        style={{ borderColor: 'var(--ph-border)' }}
      >
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
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--ph-radius-md)] transition-opacity',
              canSend
                ? 'text-white hover:opacity-90'
                : 'cursor-not-allowed text-[var(--ph-text-muted)]'
            )}
            style={{
              background: canSend ? 'var(--ph-primary)' : 'var(--ph-canvas)'
            }}
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-[var(--ph-text-muted)]">
        Press{' '}
        <kbd
          className="rounded px-1 py-px"
          style={{ background: 'var(--ph-canvas)' }}
        >
          Enter
        </kbd>{' '}
        to send,{' '}
        <kbd
          className="ml-1 rounded px-1 py-px"
          style={{ background: 'var(--ph-canvas)' }}
        >
          Shift + Enter
        </kbd>{' '}
        for a new line. Paste or attach images.
      </p>
    </div>
  )
}
