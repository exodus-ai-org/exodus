import { SettingsDialog } from '@/components/settings/settings-dialog'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router'
import { AppSidebar } from './app-sidebar'

export function Layout() {
  return (
    <SidebarProvider className="flex flex-col">
      <header className="h-12 w-full border-b" />

      <main className="flex">
        <AppSidebar />
        <Outlet />
      </main>

      <SettingsDialog />
    </SidebarProvider>
  )
}
