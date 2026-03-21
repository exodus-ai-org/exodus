import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'

import { AppSidebar } from '@/components/agent-x/dashboard/app-sidebar'
import { SiteHeader } from '@/components/agent-x/dashboard/site-header'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AgentXContainer } from '@/containers/agent-x'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'

export type AgentXPage = 'dashboard' | 'org-editor' | 'archive' | 'costs'

const pageTitles: Record<AgentXPage, string> = {
  dashboard: 'Dashboard',
  'org-editor': 'Org Editor',
  archive: 'Task Histories',
  costs: 'Cost Analysis'
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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setActivePage('dashboard')}
            className="no-drag"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Org Editor</span>
        </header>
        <main className="no-drag bg-background flex min-h-0 flex-1 overflow-hidden">
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
        <div className="no-drag @container/main flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
