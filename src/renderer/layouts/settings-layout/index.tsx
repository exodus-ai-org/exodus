import { SettingsForm } from '@/components/setting/setting-form'
import { SettingsSidebar } from '@/components/setting/setting-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { settingLabelAtom } from '@/stores/setting'
import { useAtomValue } from 'jotai'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

export function SettingsLayout() {
  const navigate = useNavigate()
  const activeTitle = useAtomValue(settingLabelAtom)
  const isFullscreen = useIsFullscreen()

  return (
    <div className="flex h-screen flex-col">
      {/* Titlebar */}
      <header
        className={cn(
          'draggable bg-background flex h-14 shrink-0 items-center gap-3 border-b',
          isFullscreen ? 'pl-4' : 'pl-[84px]'
        )}
      >
        <button
          onClick={() => navigate(-1)}
          className="no-draggable text-muted-foreground hover:text-foreground hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">Settings</span>
        {activeTitle && (
          <>
            <span className="text-muted-foreground/50 text-sm">/</span>
            <span className="text-muted-foreground text-sm">{activeTitle}</span>
          </>
        )}
      </header>

      {/* Body */}
      <SidebarProvider className="min-h-0 flex-1 overflow-hidden">
        <SettingsSidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <SettingsForm />
        </main>
      </SidebarProvider>
    </div>
  )
}
