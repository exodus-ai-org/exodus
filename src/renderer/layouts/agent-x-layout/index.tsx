import { useState } from 'react'

import { AppSidebar } from '@/components/agent-x/dashboard/app-sidebar'
import { SiteHeader } from '@/components/agent-x/dashboard/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AgentXContainer } from '@/containers/agent-x'
import { cn } from '@/lib/utils'

export type AgentXPage =
  | 'chat'
  | 'employees'
  | 'knowledge'
  | 'dashboard'
  | 'costs'

const pageTitles: Record<AgentXPage, string> = {
  chat: 'Groups',
  employees: 'Employees',
  knowledge: 'Knowledge Base',
  dashboard: 'Dashboard',
  costs: 'Cost Analysis'
}

export function AgentXLayout() {
  const [activePage, setActivePage] = useState<AgentXPage>('chat')

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={activePage}
        onNavigate={(p) => setActivePage(p as AgentXPage)}
      />
      <SidebarInset>
        <SiteHeader title={pageTitles[activePage]} />
        <div
          className={cn(
            'no-drag flex min-h-0 flex-1',
            activePage === 'chat'
              ? 'overflow-hidden'
              : 'flex-col overflow-y-auto'
          )}
        >
          <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
