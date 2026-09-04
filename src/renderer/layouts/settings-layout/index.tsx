import { AppToaster } from '@/components/app-toaster'
import { SettingsForm } from '@/components/settings/settings-form'
import { SettingsSidebar } from '@/components/settings/settings-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

export function SettingsLayout() {
  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <SettingsSidebar />
      <main className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Frameless-window drag strip in place of a titlebar. */}
        <div className="draggable h-16 shrink-0" />
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <SettingsForm />
        </div>
      </main>
      <AppToaster />
    </SidebarProvider>
  )
}
