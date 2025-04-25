import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList
} from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import { SidebarProvider } from '@/components/ui/sidebar'
import { isSettingsVisibleAtom, settingsLabelAtom } from '@/stores/settings'
import { useAtom, useAtomValue } from 'jotai'
import { SettingsForm } from './settings-form'
import { SettingsSidebar } from './settings-sidebar'

export function SettingsDialog() {
  const activeTitle = useAtomValue(settingsLabelAtom)
  const [open, setOpen] = useAtom(isSettingsVisibleAtom)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Description of settings.
        </DialogDescription>
        <SidebarProvider className="min-h-[500px] items-start">
          <SettingsSidebar />
          <main className="flex h-full max-h-[498px] flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      {activeTitle}
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              <SettingsForm />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
