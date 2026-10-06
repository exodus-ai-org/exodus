import { Outlet } from 'react-router'

import { AppToaster } from '@/components/app/app-toaster'
import { DeepResearchProcess } from '@/components/deep-research'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { SourcesPanel } from '@/components/web-search/sources-panel'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { ResizableSidebarShell } from '@/layouts/shared/resizable-sidebar'
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
      {/* While the sidebar is open its toggle sits in the sidebar's own top
          row, by the traffic lights (as Notes and ChatGPT keep it); it comes
          here only once the sidebar is away, so it can be brought back. */}
      {!open && (
        <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
      )}
      {/* The strip itself stays a drag region (the window moves by its
          empty part, as a browser's); only the tabs opt out, in ChatTabs. */}
      <div className="flex min-w-0 flex-1 self-stretch">
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
