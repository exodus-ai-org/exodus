import { useEffect, useRef, type ReactNode } from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import { useSidebar } from '@/components/ui/sidebar'

// Matches SIDEBAR_WIDTH in components/ui/sidebar.tsx and the chat layout.
const SIDEBAR_DEFAULT = '15rem'
const SIDEBAR_MIN = '15rem'
const SIDEBAR_MAX = '30rem'

/**
 * Philharmonic surface: a resizable sidebar panel + the content panel, driven
 * by `react-resizable-panels` — the same shell as the chat layout's
 * ChatWorkspace. The sidebar's collapsed state is mirrored onto the
 * SidebarProvider context so Cmd+B and SidebarTrigger keep working. (The
 * ~8-line mirror is duplicated from ChatWorkspace rather than extracted, to
 * keep the chat layout untouched.)
 */
export function PhilharmonicWorkspace({
  sidebar,
  children
}: {
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
    <div className="w-full overflow-x-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          id="ph-sidebar"
          panelRef={sidebarPanel}
          collapsible
          collapsedSize={0}
          defaultSize={SIDEBAR_DEFAULT}
          minSize={SIDEBAR_MIN}
          maxSize={SIDEBAR_MAX}
          groupResizeBehavior="preserve-pixel-size"
          onResize={(size) => {
            const collapsed = size.asPercentage === 0
            if (collapsed === wasCollapsed.current) return
            wasCollapsed.current = collapsed
            setOpen(!collapsed)
          }}
        >
          {sidebar}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="ph-content">{children}</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
