import { useAtomValue } from 'jotai'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import { SettingsForm } from '@/components/setting/setting-form'
import { menus } from '@/components/setting/setting-menu'
import { SettingsSidebar } from '@/components/setting/setting-sidebar'
import { AppToaster } from '@/components/ui/app-toaster'
import { Button } from '@/components/ui/button'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { settingLabelAtom } from '@/stores/setting'

// Build a child → parent lookup from the menu tree
const parentOf = new Map<string, string>()
for (const item of menus.navMain) {
  for (const sub of item.items ?? []) {
    parentOf.set(sub.title, item.title)
  }
}

export function SettingsLayout() {
  const navigate = useNavigate()
  const activeTitle = useAtomValue(settingLabelAtom)
  const isFullscreen = useIsFullscreen()

  return (
    <div className="flex h-screen flex-col">
      {/* Titlebar */}
      <header
        className={cn(
          'draggable bg-background flex h-12 shrink-0 items-center gap-3 border-b',
          isFullscreen ? 'pl-4' : 'pl-21'
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(-1)}
          className="no-drag"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Settings</span>
        {activeTitle && (
          <>
            {parentOf.has(activeTitle as string) && (
              <>
                <span className="text-muted-foreground/50 text-sm">/</span>
                <span className="text-muted-foreground text-sm">
                  {parentOf.get(activeTitle as string)}
                </span>
              </>
            )}
            <span className="text-muted-foreground/50 text-sm">/</span>
            <span className="text-muted-foreground text-sm">{activeTitle}</span>
          </>
        )}
      </header>

      {/* Body */}
      <SidebarProvider className="min-h-0 flex-1 overflow-hidden">
        <SettingsSidebar />
        <main className="bg-background flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <SettingsForm />
        </main>
      </SidebarProvider>
      <AppToaster />
    </div>
  )
}
