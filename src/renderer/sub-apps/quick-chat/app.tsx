import { Input } from '@/components/ui/input'
import { closeQuickChat, transferQuickChat } from '@/lib/ipc'
import { Bot } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export function FindBar() {
  const ref = useRef<HTMLInputElement | null>(null)
  const [input, setInput] = useState('')

  const handleClose = () => {
    setInput('')
    closeQuickChat()
  }

  const handleSubmit = useCallback(() => {
    if (input.trim().length === 0) return
    transferQuickChat(input.trim())
    handleClose()
  }, [input])

  useEffect(() => {
    ref.current?.focus()
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        handleClose()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      console.log(e)
      if (e.key === 'Escape') {
        handleClose()
      }

      if (e.key === 'Enter') {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit])

  return (
    <div className="bg-background flex w-[600px] items-center rounded-2xl border p-2 shadow-md">
      <Bot />
      <Input
        ref={ref}
        className="w-full border-none px-2 py-0 shadow-none focus-visible:ring-0"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="How can I help you today?"
      />
    </div>
  )
}
