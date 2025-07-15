import { CodePreview } from '@/components/artifacts/code-preview'
import { DeepResearchProcess } from '@/components/deep-research'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { isArtifactVisibleAtom } from '@/stores/chat'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'
import { ThemeSwitcher } from './theme-switcher'

function InsertedSidebar() {
  const { open } = useSidebar()
  return (
    <SidebarInset>
      <div className="bg-background flex h-dvh min-w-0 flex-col">
        <header className="draggable sticky flex h-14 w-full shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger
              className={cn({ ['ml-16']: !open }, 'no-draggable')}
            />
          </div>
          <div className="ml-auto px-3">
            <ThemeSwitcher className="no-draggable" />
          </div>
        </header>
        <Outlet />
        <Toaster />
        <SettingsDialog />
        <SearchDialog />
        <RenameChatDialog />
        <ChatDeletionConfirmationDialog />
      </div>
    </SidebarInset>
  )
}

export function Layout() {
  const isArtifactVisible = useAtomValue(isArtifactVisibleAtom)

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
    <SidebarProvider>
      <AppSidebar />
      <InsertedSidebar />
      <DeepResearchProcess />
      {isArtifactVisible && <CodePreview />}
    </SidebarProvider>
  )
}
