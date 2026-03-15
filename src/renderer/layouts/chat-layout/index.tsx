import { DeepResearchProcess } from '@/components/deep-research'
import { AppToaster } from '@/components/ui/app-toaster'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
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
        'draggable border-border bg-card flex h-14 shrink-0 items-center rounded-tl-xl border-b pr-3 transition-[padding] duration-200 ease-linear',
        open ? 'pl-1' : isFullscreen ? 'pl-4' : 'pl-21'
      )}
    >
      <SidebarTrigger className="no-draggable text-muted-foreground hover:text-foreground" />
      <div className="no-draggable flex min-w-0 flex-1 self-stretch">
        <ChatTabs />
      </div>
    </header>
  )
}

function InsertedSidebar() {
  return (
    <SidebarInset className="bg-card flex min-w-0 flex-col rounded-xl">
      <ContentHeader />
      <Outlet />
      <AppToaster />
      <SearchDialog />
      <RenameChatDialog />
      <ChatDeletionConfirmationDialog />
    </SidebarInset>
  )
}

export function Layout() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electron.ipcRenderer.invoke('close-search-bar')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <SidebarProvider>
      <div className="w-full">
        <div className="flex h-screen">
          <AppSidebar />
          <InsertedSidebar />
        </div>
      </div>
      <DeepResearchProcess />
    </SidebarProvider>
  )
}
