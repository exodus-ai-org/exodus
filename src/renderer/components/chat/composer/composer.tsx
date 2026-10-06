import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { composeQuoted } from '@exodus/shared/utils/quoted-text'
import { BorderBeam } from 'border-beam'
import { useAtom, useAtomValue } from 'jotai'
import {
  ArrowUpIcon,
  CornerDownRightIcon,
  SquareIcon,
  XIcon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  ChangeEvent,
  ClipboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef
} from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { sileo } from 'sileo'

import { UseChatHelpers } from '@/hooks/use-chat'
import { useUpload } from '@/hooks/use-upload'
import {
  pastedFiles,
  pasteKeepsText,
  pasteUploadsImages
} from '@/lib/clipboard-paste'
import { cn } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import {
  chatInputAtom,
  chatInputFocusAtom,
  chatQuoteAtom,
  chatStatusAtom,
  chatStopFnAtom
} from '@/stores/input'

import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { AudioRecorder } from './audio-recorder'
import { ActiveToolPills, ComposerToolsButton } from './composer-tools'
import { FilePreview } from './file-preview'

// Props are deliberately few and stable: this is `memo`'d, and `<Chat>`
// re-renders on every streamed frame. It used to also take `messages`,
// `setMessages` and `lastUsage` — none of them read — and `messages` alone
// changed per frame, so the whole composer re-rendered along with the stream.
function InputBox({
  chatId,
  sendMessage
}: {
  chatId: string
  sendMessage: UseChatHelpers['sendMessage']
}) {
  const { t } = useTranslation('chat')
  const [input, setInput] = useAtom(chatInputAtom)
  // Staged attachments live in `attachmentAtom` — the single source of truth
  // shared with `<FilePreview>` and `useUpload`. (This component used to take
  // its own `attachments` prop from `<Chat>`, which was never wired to the
  // atom: picked images showed in the preview but weren't sent and weren't
  // cleared on submit.)
  const [attachments, setAttachments] = useAtom(attachmentAtom)
  // "Ask about this": text selected in a message of this chat (see
  // `SelectionAsk`), sent with the next message as a quote.
  const [anyQuote, setQuote] = useAtom(chatQuoteAtom)
  const quote = anyQuote?.chatId === chatId ? anyQuote.text : null
  const status = useAtomValue(chatStatusAtom)
  const stop = useAtomValue(chatStopFnAtom)
  const { id } = useParams()
  const { uploadFile } = useUpload()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // isTyping tracks IME composition state; never shown on screen, so useRef
  // avoids the unnecessary re-render that useState would cause on each keystroke.
  const isTypingRef = useRef(false)
  const { resolvedTheme } = useTheme()

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    adjustHeight()
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const { clipboardData } = event
    const { images, fileNames } = pastedFiles(clipboardData.items)
    if (images.length === 0) return

    const clipboard = {
      fileNames,
      plain: clipboardData.getData('text/plain'),
      html: clipboardData.getData('text/html')
    }
    // Not the clipboard's text when it only names the files (Finder's copy).
    if (!pasteKeepsText(clipboard)) event.preventDefault()
    // Cells from Excel carry a picture of themselves beside their text: the
    // text alone is what was copied.
    if (pasteUploadsImages(clipboard)) uploadFile(images)
  }

  const submitForm = useCallback(() => {
    // URL update is handled by Chat's onFinish to avoid interrupting the stream.
    // The hash, not the path: the router is a hash router, and in the packaged
    // app a path rewrite pointed `file://` at a file that does not exist, so a
    // reload after a new chat's first message was ERR_FILE_NOT_FOUND.
    if (!id) {
      window.history.replaceState({}, '', `#/chat/${chatId}`)
    }

    // A quote is sent with a question about it, not by itself.
    if (quote !== null && input.trim() === '') return

    sendMessage({
      text: quote === null ? input : composeQuoted(quote, input),
      attachments: attachments ?? []
    })

    setAttachments(undefined)
    setInput('')
    if (quote !== null) setQuote(null)
    // Inline reset so we don't add a recreated-each-render function to deps.
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [
    attachments,
    chatId,
    input,
    quote,
    sendMessage,
    setAttachments,
    setInput,
    setQuote,
    textareaRef
  ])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  // Someone outside the composer wrote `chatInputAtom` and asked for focus
  // ("Fix in chat" on a used memory): take it, caret after the prefilled text.
  // Only a change counts — the atom outlives this chat's composer.
  const focusRequest = useAtomValue(chatInputFocusAtom)
  const handledFocusRequest = useRef(focusRequest)
  useEffect(() => {
    if (focusRequest === handledFocusRequest.current) return
    handledFocusRequest.current = focusRequest
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [focusRequest])

  return (
    <BorderBeam
      size={resolvedTheme === 'light' ? 'pulse-outside' : 'pulse-inner'}
      className={cn(
        'mx-auto flex w-[calc(100%-8rem)] flex-col md:max-w-3xl',
        !id && 'mb-4'
      )}
    >
      <div className="border-border/60 focus-within:border-border/90 z-1 flex flex-col gap-1.5 rounded-[28px] border bg-transparent px-2.5 py-2 shadow-[0_2px_6px_rgb(0_0_0/0.04),0_10px_28px_rgb(0_0_0/0.06)] backdrop-blur-md transition-colors">
        {quote !== null && (
          <div
            data-testid={TEST_IDS.composer.quote}
            className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-[20px] py-2 pr-1.5 pl-3 text-sm"
          >
            <CornerDownRightIcon className="mt-0.5 size-4 shrink-0" />
            <p
              title={quote}
              className="line-clamp-2 min-w-0 flex-1 wrap-break-word whitespace-pre-wrap"
            >
              {quote}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 rounded-full [&_svg]:size-3.5"
              aria-label={t('ask.remove')}
              data-testid={TEST_IDS.composer.quoteRemove}
              onClick={() => setQuote(null)}
            >
              <XIcon />
            </Button>
          </div>
        )}
        <FilePreview />
        <ActiveToolPills />
        <div className="flex items-end gap-1">
          <ComposerToolsButton />
          {/*
            Pin to 16px (matching the message body). The base Textarea is
            `text-base md:text-sm`, an iOS-zoom guard that's meaningless in
            Electron — it only made the composer text + line-height jump
            16↔14px / 24↔20px as the window crossed the `md` breakpoint.
          */}
          <Textarea
            ref={textareaRef}
            data-testid={TEST_IDS.composer.textarea}
            placeholder={t('composer.placeholder')}
            value={input}
            onChange={handleInput}
            className="max-h-[45dvh] min-h-8 flex-1 resize-none rounded-none border-none bg-transparent! px-1 py-1 text-base leading-6 shadow-none focus-visible:ring-0 md:text-base"
            rows={1}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()

                if (isTypingRef.current) {
                  return
                }

                if (status === 'streaming') {
                  sileo.warning({
                    title: t('composer.pleaseWaitTitle'),
                    description: t('composer.pleaseWaitDescription')
                  })
                } else {
                  submitForm()
                }
              }
            }}
            onCompositionStart={() => {
              isTypingRef.current = true
            }}
            onCompositionEnd={() => {
              isTypingRef.current = false
            }}
            onPaste={handlePaste}
          />

          {status === 'submitted' || status === 'streaming' ? (
            <Button
              size="icon"
              // Neutral, whatever the tone, as ChatGPT's: a dark square on a
              // soft tone fill (emerald, yellow) read as a stray black blot,
              // and a stop that differs from send says a reply is running.
              className="bg-foreground text-background hover:bg-foreground/85 rounded-full"
              aria-label={t('composer.stop')}
              onClick={stop ?? undefined}
            >
              <SquareIcon className="size-3 fill-current" />
            </Button>
          ) : input.trim() === '' ? (
            <AudioRecorder input={input} setInput={setInput} />
          ) : (
            <Button
              size="icon"
              // Light: the tone's ink with a white arrow (a white arrow on the
              // soft fill is 1.6:1 in yellow). Dark: the fill and its glyph.
              className="bg-primary-ink hover:bg-primary-ink/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 rounded-full text-white"
              type="button"
              aria-label={t('composer.send')}
              onClick={submitForm}
            >
              <ArrowUpIcon />
            </Button>
          )}
        </div>
      </div>
      {/* {lastUsage && (
        <div className="text-muted-foreground/70 flex justify-end gap-2 px-1 py-1 text-[10px]">
          <span>↑{lastUsage.input.toLocaleString()}</span>
          <span>↓{lastUsage.output.toLocaleString()}</span>
          <span>∑{lastUsage.totalTokens.toLocaleString()}</span>
          {lastUsage.cost.total > 0 && (
            <span>${lastUsage.cost.total.toFixed(4)}</span>
          )}
        </div>
      )} */}
    </BorderBeam>
  )
}

export default memo(InputBox)
