import { QUICK_CHAT_KEY } from '@exodus/shared/constants/misc'
import { IpcRendererEvent } from 'electron'
import { useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { AppToaster } from '@/components/app-toaster'
import { DeepResearchProcess } from '@/components/deep-research'
import { SourcesPanel } from '@/components/sources-panel'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { ResizableSidebarShell } from '@/layouts/shared/resizable-sidebar'
import { subscribeQuickChatInput, unsubscribeQuickChatInput } from '@/lib/ipc'
import { cn } from '@/lib/utils'

import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { ChatTabs } from './chat-tabs'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'

function ContentHeader() {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()
  return (
    <header
      className={cn(
        'draggable border-border bg-card/80 flex h-12 shrink-0 items-center rounded-tl-xl border-b pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-out',
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

function ChatWorkspace() {
  return (
    <ResizableSidebarShell id="chat" sidebar={<AppSidebar />}>
      <InsertedSidebar />
    </ResizableSidebarShell>
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
    <SidebarProvider className="h-screen overflow-hidden">
      <ChatWorkspace />
      <DeepResearchProcess />
      <SourcesPanel />
    </SidebarProvider>
  )
}
