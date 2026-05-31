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
  return (
    <div className="flex items-end gap-2 border-t p-3">
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
        className="max-h-40 min-h-[44px] resize-none"
      />
      <Button onClick={submit} disabled={disabled} size="icon">
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
