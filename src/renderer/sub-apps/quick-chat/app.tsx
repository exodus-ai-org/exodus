import { BotIcon, CornerDownLeftIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { closeQuickChat, transferQuickChat } from '@/lib/ipc'
import { cn } from '@/lib/utils'

export function QuickChat() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const submittingRef = useRef(false)

  const handleClose = useCallback(() => {
    if (submittingRef.current) return
    setValue('')
    closeQuickChat()
  }, [])

  const handleSubmit = useCallback(async () => {
    const text = value.trim()
    if (text.length === 0 || submittingRef.current) return

    submittingRef.current = true
    // transferQuickChat brings the main window to front and closes this window
    await transferQuickChat(text)
    // Window will be destroyed by main process after transfer; no need to call handleClose
  }, [value])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on window blur (e.g. clicking outside)
  useEffect(() => {
    const onBlur = () => handleClose()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [handleClose])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose, handleSubmit])

  return (
    <div className="bg-background flex w-[600px] items-center gap-2 rounded-2xl border p-2 shadow-lg">
      <BotIcon className="text-muted-foreground ml-1 shrink-0" size={18} />
      <Input
        ref={inputRef}
        className="w-full border-none px-1 py-0 shadow-none focus-visible:ring-0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="How can I help you today?"
      />
      <kbd
        className={cn(
          'text-muted-foreground pointer-events-none flex shrink-0 select-none items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-opacity',
          value.trim().length > 0 ? 'opacity-100' : 'opacity-0'
        )}
      >
        <CornerDownLeftIcon size={10} />
      </kbd>
    </div>
  )
}
