import { CodePreview } from '@/components/artifacts/code-preview'
import { DeepResearchProcess } from '@/components/deep-research'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { activeDeepResearchIdAtom, isArtifactVisibleAtom } from '@/stores/chat'
import { Separator } from '@radix-ui/react-separator'
import { AnimatePresence } from 'framer-motion'
import { useAtomValue } from 'jotai'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { AppSidebar } from './app-sidebar'
import { ChatDeletionConfirmationDialog } from './chat-deletion-confirmation-dialog'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'
import { ThemeSwitcher } from './theme-switcher'

export function Layout() {
  const activeDeepResearchId = useAtomValue(activeDeepResearchIdAtom)
  const isArtifactVisible = useAtomValue(isArtifactVisibleAtom)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="bg-background flex h-dvh min-w-0 flex-col">
          <header className="sticky flex h-14 w-full shrink-0 items-center gap-2">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
            <div className="ml-auto px-3">
              <ThemeSwitcher />
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
      <AnimatePresence>
        {!!activeDeepResearchId && <DeepResearchProcess />}
        {isArtifactVisible && <CodePreview />}
      </AnimatePresence>
    </SidebarProvider>
  )
}
