import { CodePreview } from '@/components/code-preview'
import { DeepResearchProcess } from '@/components/deep-research'
import { Immersion } from '@/components/immersion'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { isCodePreviewVisibleAtom, isImmersionVisibleAtom } from '@/stores/chat'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'

function InsertedSidebar() {
  return (
    <SidebarInset className="bg-background flex min-w-0 flex-col">
      <Outlet />
      <Toaster />
      <SettingsDialog />
      <SearchDialog />
      <RenameChatDialog />
      <ChatDeletionConfirmationDialog />
    </SidebarInset>
  )
}

function FixedHeaderAction() {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        'draggable z-[11] flex h-14 w-(--sidebar-width) shrink-0 items-center justify-end border-b border-b-transparent py-3 pr-2 pl-22 transition-[border,width] duration-200 ease-linear',
        {
          ['border-b-border w-32 transition-[border,width] duration-200 ease-linear']:
            !open
        }
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="no-draggable" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{open ? 'Close' : 'Open'} sidebar</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function Layout() {
  const isCodePreviewVisible = useAtomValue(isCodePreviewVisibleAtom)
  const isImmersionVisible = useAtomValue(isImmersionVisibleAtom)

  // Unload Find-in-Page when pressing Esc
  // The listener should be mounted in both main window and searchbar view
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
    <SidebarProvider className="flex flex-col">
      <div className="flex w-full">
        <FixedHeaderAction />
        <header className="draggable bg-background border-b-border flex h-14 w-full items-center border-b p-3">
          ChatGPT
        </header>
      </div>
      <div className="flex h-[calc(100dvh-3.5rem)] overflow-y-hidden">
        <AppSidebar />
        <section className="flex w-full">
          <InsertedSidebar />
          <DeepResearchProcess />
          {isCodePreviewVisible && <CodePreview />}
          {isImmersionVisible && <Immersion />}
        </section>
      </div>
    </SidebarProvider>
  )
}
