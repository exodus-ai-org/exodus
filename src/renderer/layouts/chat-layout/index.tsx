import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { IpcRendererEvent } from 'electron'
import { useCallback, useEffect, useRef } from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { Outlet, useNavigate } from 'react-router'

import { AppToaster } from '@/components/app-toaster'
import { DeepResearchProcess } from '@/components/deep-research'
import { SourcesPanel } from '@/components/sources-panel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { subscribeQuickChatInput, unsubscribeQuickChatInput } from '@/lib/ipc'
import { cn } from '@/lib/utils'

import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { ChatTabs } from './chat-tabs'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'

// Chat sidebar sizing — matches SIDEBAR_WIDTH in components/ui/sidebar.tsx.
const SIDEBAR_DEFAULT = '15rem'
const SIDEBAR_MIN = '15rem'
const SIDEBAR_MAX = '30rem'

function ContentHeader() {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()
  return (
    <header
      className={cn(
        'draggable border-border bg-card/80 flex h-12 shrink-0 items-center rounded-tl-xl border-b pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-linear',
        open ? 'pl-1' : isFullscreen ? 'pl-4' : 'pl-21'
      )}
    >
      <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
      <div className="no-drag flex min-w-0 flex-1 self-stretch">
        <ChatTabs />
      </div>
    </header>
  )
}

function InsertedSidebar() {
  return (
    <SidebarInset className="bg-card flex h-full min-w-0 flex-col overflow-hidden">
      <ContentHeader />
      <Outlet />
      <AppToaster />
      <SearchDialog />
      <RenameChatDialog />
      <ChatDeletionConfirmationDialog />
    </SidebarInset>
  )
}

/**
 * Chat surface: a resizable sidebar panel + the content panel, driven by
 * `react-resizable-panels`. The sidebar's collapsed state is mirrored onto the
 * `SidebarProvider` context so Cmd+B and `SidebarTrigger` keep working — Cmd+B
 * flips `open`, the effect collapses/expands the panel; a drag past the min
 * width collapses the panel, `onResize` flips `open` back.
 */
function ChatWorkspace() {
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
          id="chat-sidebar"
          panelRef={sidebarPanel}
          collapsible
          collapsedSize={0}
          defaultSize={SIDEBAR_DEFAULT}
          minSize={SIDEBAR_MIN}
          maxSize={SIDEBAR_MAX}
          groupResizeBehavior="preserve-pixel-size"
          onResize={(size) => {
            // Mirror a drag-collapse / drag-open onto the sidebar context.
            const collapsed = size.asPercentage === 0
            if (collapsed === wasCollapsed.current) return
            wasCollapsed.current = collapsed
            setOpen(!collapsed)
          }}
        >
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="chat-content">
          <InsertedSidebar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export function Layout() {
  const navigate = useNavigate()

  // Listen for quick-chat input at layout level so it works regardless of current route
  const onQuickChatInput = useCallback(
    (_: IpcRendererEvent, text: string) => {
      window.localStorage.setItem(QUICK_CHAT_KEY, text)
      navigate('/')
    },
    [navigate]
  )

  useEffect(() => {
    subscribeQuickChatInput(onQuickChatInput)
    return () => unsubscribeQuickChatInput(onQuickChatInput)
  }, [onQuickChatInput])

  // Central keyboard shortcuts (Mod+N, Mod+W, Mod+,, Mod+Shift+F, Escape, etc.)
  useKeyboardShortcuts()

  return (
    <SidebarProvider>
      <ChatWorkspace />
      <DeepResearchProcess />
      <SourcesPanel />
    </SidebarProvider>
  )
}
