import { useEffect, useRef, type ReactNode } from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import { useSidebar } from '@/components/ui/sidebar'

// Initial + minimum sidebar width; matches SIDEBAR_WIDTH in
// components/ui/sidebar.tsx (the shadcn `--sidebar-width` CSS var).
const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_MAX_WIDTH = '30rem'

/**
 * The resizable `[ sidebar | content ]` shell shared by the Chat and
 * Philharmonic surfaces, driven by `react-resizable-panels`.
 *
 * The sidebar panel's collapsed state is mirrored onto the `SidebarProvider`
 * context so Cmd+B and `SidebarTrigger` keep working: Cmd+B flips `open` and
 * the effect collapses/expands the panel; a drag past the min width collapses
 * the panel and `onResize` flips `open` back.
 *
 * `id` namespaces the two panels as `<id>-sidebar` / `<id>-content` — keep it
 * stable; `#chat-sidebar` is asserted by `tests/e2e/sidebar.spec.ts`.
 */
export function ResizableSidebarShell({
  id,
  sidebar,
  children
}: {
  id: string
  sidebar: ReactNode
  children: ReactNode
}) {
  const { open, setOpen } = useSidebar()
  const sidebarPanel = useRef<PanelImperativeHandle>(null)
  const wasCollapsed = useRef(false)

  useEffect(() => {
    const panel = sidebarPanel.current
    if (!panel) return
    if (open && panel.isCollapsed()) panel.expand()
    else if (!open && !panel.isCollapsed()) panel.collapse()
  }, [open])

  return (
    <div className="h-full w-full overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          id={`${id}-sidebar`}
          panelRef={sidebarPanel}
          collapsible
          collapsedSize={0}
          defaultSize={SIDEBAR_WIDTH}
          minSize={SIDEBAR_WIDTH}
          maxSize={SIDEBAR_MAX_WIDTH}
          groupResizeBehavior="preserve-pixel-size"
          onResize={(size) => {
            // Mirror a drag-collapse / drag-open onto the sidebar context.
            const collapsed = size.asPercentage === 0
            if (collapsed === wasCollapsed.current) return
            wasCollapsed.current = collapsed
            setOpen(!collapsed)
          }}
        >
          {sidebar}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id={`${id}-content`}>{children}</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
