// src/renderer/components/agent-x/chat/composer.tsx
import { SendIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
    <div className="border-t px-4 pt-3 pb-4">
      <div className="bg-background focus-within:ring-ring/30 focus-within:border-ring/40 flex items-end gap-2 rounded-2xl border p-2 transition-shadow focus-within:ring-[3px]">
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
        <Button
          onClick={submit}
          disabled={!canSend}
          size="icon-sm"
          aria-label="Send"
        >
          <SendIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-1.5 px-1 text-[10px]">
        Press <kbd className="bg-muted rounded px-1 py-px">Enter</kbd> to send,
        <kbd className="bg-muted ml-1 rounded px-1 py-px">
          Shift + Enter
        </kbd>{' '}
        for a new line.
      </p>
    </div>
  )
}
