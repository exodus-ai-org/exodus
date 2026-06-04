// src/renderer/components/philharmonic/chat/composer.tsx
import { SendIcon } from 'lucide-react'
import { useState } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function Composer({
  onSend,
  disabled
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  const canSend = !disabled && text.trim().length > 0

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
          'flex items-end gap-2 rounded-[var(--ph-radius-xl)] border bg-[var(--ph-surface)] p-2 pl-3.5 transition-shadow',
          'focus-within:border-[var(--ph-primary)] focus-within:ring-[3px] focus-within:ring-[var(--ph-primary-soft)]'
        )}
        style={{ borderColor: 'var(--ph-border)' }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Message your team…"
          className="max-h-48 min-h-[36px] resize-none border-0 bg-transparent p-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
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
        for a new line.
      </p>
    </div>
  )
}
