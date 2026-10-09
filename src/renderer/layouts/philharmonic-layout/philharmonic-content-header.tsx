import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { HistoryArrows } from '@/components/chat/header/history-arrows'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'

/**
 * The content pane's bar, Chat's own (`chat-layout`'s ContentHeader): 44 px,
 * no rule under it — the page dissolves into the bar's colour as it scrolls
 * under — and the sidebar toggle with the history arrows only once the
 * sidebar is away (while it is open they sit in its top row). `children` is
 * the page's title and actions, laid out as Chat's title group: on the
 * left, actions pushed right by the page itself. The bar is the window's drag
 * region, so every control in it must be `no-drag`.
 */
export function PhilharmonicContentHeader({
  children,
  className
}: {
  children?: ReactNode
  className?: string
}) {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()

  return (
    <header
      className={cn(
        'draggable bg-card/80 relative z-10 flex h-11 shrink-0 items-center gap-1 rounded-tl-xl pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-out',
        'after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-linear-to-b after:from-card after:to-transparent',
        open ? 'pl-1' : isFullscreen ? 'pl-4' : 'pl-21',
        className
      )}
    >
      {!open && (
        <>
          <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
          <HistoryArrows />
        </>
      )}
      {children}
    </header>
  )
}

const HeaderSlotContext = createContext<HTMLElement | null>(null)

/**
 * The config pages' (Workforce, Dashboard) bar, with a slot a page fills
 * through `PhilharmonicHeaderSlot` — the page keeps its title and buttons
 * with its own state, and they show in the one bar instead of a second
 * header under it.
 */
export function PhilharmonicSlottedHeader({
  children
}: {
  children: ReactNode
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <HeaderSlotContext.Provider value={slot}>
      <PhilharmonicContentHeader>
        <div
          ref={setSlot}
          className="flex min-w-0 flex-1 items-center gap-2 self-stretch"
        />
      </PhilharmonicContentHeader>
      {children}
    </HeaderSlotContext.Provider>
  )
}

/** Renders its children into the content header's slot (nothing outside a `PhilharmonicSlottedHeader`). */
export function PhilharmonicHeaderSlot({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext)
  return slot ? createPortal(children, slot) : null
}
