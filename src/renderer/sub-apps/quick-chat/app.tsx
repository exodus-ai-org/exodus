import { useHotkeys } from '@tanstack/react-hotkeys'
import { BotIcon, CornerDownLeftIcon } from 'lucide-react'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { closeQuickChat, transferQuickChat } from '@/lib/ipc'
import { ENTER_UP } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function QuickChat() {
  const { t } = useTranslation('chat')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const submittingRef = useRef(false)

  const handleClose = useCallback(() => {
    if (submittingRef.current) return
    setValue('')
    void closeQuickChat()
  }, [])

  const handleSubmit = useCallback(async () => {
    const text = value.trim()
    if (text.length === 0 || submittingRef.current) return

    submittingRef.current = true
    // transferQuickChat brings the main window to front and closes this window
    await transferQuickChat(text)
    // Window will be destroyed by main process after transfer; no need to call handleClose
  }, [value])

  // Effect Events: always read the latest handler without being reactive deps,
  // so the blur effect doesn't re-subscribe on every value change.
  const onClose = useEffectEvent(() => handleClose())

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on window blur (e.g. clicking outside)
  useEffect(() => {
    const onBlur = () => onClose()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [])

  // Enter inside the input is the point, so inputs are not skipped; a key that
  // is committing an IME composition is not a submit.
  useHotkeys(
    [
      { hotkey: 'Escape', callback: () => handleClose() },
      {
        hotkey: 'Enter',
        callback: (event) => {
          if (!event.isComposing) void handleSubmit()
        }
      }
    ],
    { ignoreInputs: false }
  )

  const hasText = value.trim().length > 0

  // The window is a transparent stage a little larger than the pill (see
  // window.ts) so the pill's shadow has room to fall.
  return (
    <div className="flex h-screen items-center justify-center px-6">
      <div
        className={cn(
          'bg-popover text-popover-foreground border-border/60 flex w-full items-center gap-2 rounded-3xl border p-2 pl-4 shadow-lg',
          ENTER_UP
        )}
      >
        <BotIcon className="text-muted-foreground shrink-0" size={18} />
        <Input
          ref={inputRef}
          className="h-10 w-full border-none bg-transparent px-1 py-0 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('quickChat.placeholder')}
          aria-label={t('quickChat.placeholder')}
          autoComplete="off"
        />
        <Kbd
          className={cn(
            'mr-1 transition-opacity duration-150 ease-out',
            hasText ? 'opacity-100' : 'opacity-0'
          )}
        >
          <CornerDownLeftIcon />
        </Kbd>
      </div>
    </div>
  )
}
