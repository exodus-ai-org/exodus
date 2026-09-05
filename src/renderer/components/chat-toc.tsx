import { TEST_IDS } from '@shared/constants/test-ids'
import type { ChatMessage } from '@shared/types/chat'
import { type RefObject, useEffect, useRef, useState } from 'react'

import { userMessageText } from '@/lib/user-message-text'
import { cn } from '@/lib/utils'

// Below this many user messages there is nothing worth navigating.
const MIN_ENTRIES = 2
// Where a jumped-to message lands, measured from the scroll container's top.
const SCROLL_OFFSET = 88

interface TocEntry {
  id: string
  text: string
}

/**
 * A ChatGPT-style navigation rail pinned to the right edge of the chat area.
 * Each user message is one entry: a thin bar when collapsed, a truncated line
 * when the rail is hovered. Clicking scrolls that message near the top; the
 * active entry tracks the scroll position.
 */
export function ChatToc({
  scrollContainerRef,
  messages
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  messages: ChatMessage[]
}) {
  const entries: TocEntry[] = messages
    .filter((m) => m.role === 'user')
    .map((m) => ({ id: m.id, text: userMessageText(m) || 'Message' }))

  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enoughEntries = entries.length >= MIN_ENTRIES

  // Scroll-spy: the last user message whose top has crossed the offset line
  // is the active one. Reads the DOM live on every scroll/resize so it always
  // sees the current set of message nodes.
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !enoughEntries) return

    const compute = () => {
      const nodes =
        container.querySelectorAll<HTMLElement>('[data-user-msg-id]')
      if (nodes.length === 0) return
      const line = container.getBoundingClientRect().top + SCROLL_OFFSET
      let current = nodes[0].dataset.userMsgId ?? null
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.dataset.userMsgId ?? current
        } else {
          break
        }
      }
      setActiveId(current)
    }

    compute()
    container.addEventListener('scroll', compute, { passive: true })
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => {
      container.removeEventListener('scroll', compute)
      ro.disconnect()
    }
  }, [scrollContainerRef, enoughEntries, entries.length])

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
    }
  }, [])

  if (!enoughEntries) return null

  const jumpTo = (id: string) => {
    const container = scrollContainerRef.current
    const node = container?.querySelector<HTMLElement>(
      `[data-user-msg-id="${CSS.escape(id)}"]`
    )
    if (!container || !node) return
    const delta =
      node.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      SCROLL_OFFSET
    container.scrollBy({ top: delta, behavior: 'smooth' })
    setActiveId(id)
  }

  const open = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    setExpanded(true)
  }
  const scheduleClose = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), 120)
  }

  return (
    <div
      className="absolute top-1/2 right-3 z-10 -translate-y-1/2"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      data-testid={TEST_IDS.chatToc.rail}
    >
      {expanded ? (
        <div className="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 flex max-h-[70vh] w-64 flex-col gap-0.5 overflow-y-auto rounded-xl border p-1.5 shadow-lg backdrop-blur">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpTo(entry.id)}
              data-testid={TEST_IDS.chatToc.entry}
              className={cn(
                'truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                entry.id === activeId
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {entry.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar flex max-h-[70vh] flex-col items-end gap-1.5 overflow-y-auto py-1">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-label={entry.text}
              onClick={() => jumpTo(entry.id)}
              className="group flex h-3 items-center"
            >
              <span
                className={cn(
                  'h-0.5 rounded-full transition-all',
                  entry.id === activeId
                    ? 'bg-foreground/70 w-6'
                    : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60 w-4'
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
