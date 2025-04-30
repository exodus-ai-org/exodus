import { SettingsDialog } from '@/components/settings/settings-dialog'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@radix-ui/react-separator'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { AppSidebar } from './app-sidebar'
import { RenameChatDialog } from './rename-chat-dialog'
import { SearchDialog } from './search-dialog'
import { ThemeSwitcher } from './theme-switcher'

export function Layout() {
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
