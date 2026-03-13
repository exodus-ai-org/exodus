import { CodePreview } from '@/components/code-preview'
import { DeepResearchProcess } from '@/components/deep-research'
import { Immersion } from '@/components/immersion'
import { useTheme } from '@/components/theme-provider'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { isCodePreviewVisibleAtom, isImmersionVisibleAtom } from '@/stores/chat'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from 'sileo'
import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { ChatTabs } from './chat-tabs'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'

function ContentHeader() {
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'draggable border-border bg-card flex h-14 shrink-0 items-center border-b pr-3 transition-[padding] duration-200 ease-linear',
        // When sidebar is open, just a small left gap.
        // When closed, push trigger past the macOS traffic lights (~84px).
        open ? 'pl-1' : 'pl-[84px]'
      )}
    >
      <SidebarTrigger className="no-draggable text-muted-foreground hover:text-foreground" />
      <div className="no-draggable min-w-0 flex-1">
        <ChatTabs />
      </div>
    </header>
  )
}

function InsertedSidebar() {
  const { actualTheme } = useTheme()

  return (
    <SidebarInset className="bg-card flex min-w-0 flex-col">
      <ContentHeader />
      <Outlet />
      <Toaster
        options={{
          position: 'bottom-right',
          fill: actualTheme === 'dark' ? '#f2f2f2' : '#1a1a1a',
          autopilot: {
            expand: 500,
            collapse: 3000
          },
          styles: {
            description:
              actualTheme === 'dark' ? 'text-black/80' : 'text-white/80'
          }
        }}
      />
      <SearchDialog />
      <RenameChatDialog />
      <ChatDeletionConfirmationDialog />
    </SidebarInset>
  )
}

export function Layout() {
  const isCodePreviewVisible = useAtomValue(isCodePreviewVisibleAtom)
  const isImmersionVisible = useAtomValue(isImmersionVisibleAtom)

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
      <div className={cn('w-full', { ['w-100']: isImmersionVisible })}>
        <div className="flex h-screen">
          <AppSidebar />
          <InsertedSidebar />
        </div>
      </div>
      <DeepResearchProcess />
      {isCodePreviewVisible && <CodePreview />}
      {isImmersionVisible && <Immersion />}
    </SidebarProvider>
  )
}
