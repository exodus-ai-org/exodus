import { Outlet } from 'react-router'

import { AppToaster } from '@/components/app/app-toaster'
import { ChatPanel } from '@/components/chat/panel/chat-panel'
import { DeepResearchProcess } from '@/components/deep-research'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useRouteHistoryRecorder } from '@/hooks/use-route-history'
import { ResizableSidebarShell } from '@/layouts/shared/resizable-sidebar'
import { cn } from '@/lib/utils'

import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'

function ContentHeader() {
  const { open } = useSidebar()
  const isFullscreen = useIsFullscreen()
  return (
    <header
      className={cn(
        'draggable border-border bg-card/80 flex h-12 shrink-0 items-center gap-1 rounded-tl-xl border-b pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-out',
        open ? 'pl-1' : isFullscreen ? 'pl-4' : 'pl-21'
      )}
    >
      {/* While the sidebar is open its toggle sits in the sidebar's own top
          row, by the traffic lights (as Notes and ChatGPT keep it); it comes
          here only once the sidebar is away, so it can be brought back. The
          header stays a drag region: every control in it is `no-drag`. */}
      {!open && (
        <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
      )}
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
  // The pages shown, for the header's arrows; and the central keyboard
  // shortcuts (Mod+N, Mod+W, Mod+[, Mod+], Mod+,, Mod+Shift+F, Escape, etc.).
  useRouteHistoryRecorder()
  useKeyboardShortcuts()

  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <ChatWorkspace />
      <DeepResearchProcess />
      <ChatPanel />
    </SidebarProvider>
  )
}
