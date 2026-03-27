import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { IpcRendererEvent } from 'electron'
import { useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { DeepResearchProcess } from '@/components/deep-research'
import { SourcesPanel } from '@/components/sources-panel'
import { AppToaster } from '@/components/ui/app-toaster'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
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
    <SidebarInset className="bg-card flex min-w-0 flex-col rounded-tl-xl rounded-bl-xl">
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
      <div className="w-full overflow-x-hidden">
        <div className="flex h-screen">
          <AppSidebar />
          <InsertedSidebar />
        </div>
      </div>
      <DeepResearchProcess />
      <SourcesPanel />
    </SidebarProvider>
  )
}
