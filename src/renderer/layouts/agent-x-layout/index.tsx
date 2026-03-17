import { AppSidebar } from '@/components/agent-x/dashboard/app-sidebar'
import { SiteHeader } from '@/components/agent-x/dashboard/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AgentXContainer } from '@/containers/agent-x'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'

export type AgentXPage = 'dashboard' | 'org-editor' | 'tasks'

const pageTitles: Record<AgentXPage, string> = {
  dashboard: 'Dashboard',
  'org-editor': 'Org Editor',
  tasks: 'Tasks'
}

export function AgentXLayout() {
  const [activePage, setActivePage] = useState<AgentXPage>('dashboard')
  const isFullscreen = useIsFullscreen()

  // Org Editor gets its own standalone layout (no sidebar)
  if (activePage === 'org-editor') {
    return (
      <div className="flex h-screen flex-col">
        <header
          className={cn(
            'draggable bg-background flex h-14 shrink-0 items-center gap-3 border-b',
            isFullscreen ? 'pl-4' : 'pl-21'
          )}
        >
          <button
            onClick={() => setActivePage('dashboard')}
            className="no-draggable text-muted-foreground hover:text-foreground hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Org Editor</span>
        </header>
        <main className="no-draggable bg-background flex min-h-0 flex-1 overflow-hidden">
          <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page as AgentXPage)}
      />
      <SidebarInset>
        <SiteHeader title={pageTitles[activePage]} />
        <div className="no-draggable @container/main flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
