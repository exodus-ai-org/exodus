import { useEffect, useState } from 'react'

import { AppSidebar } from '@/components/agent-x/dashboard/app-sidebar'
import { SiteHeader } from '@/components/agent-x/dashboard/site-header'
import { AppToaster } from '@/components/app-toaster'
import {
  SidebarInset,
  SidebarProvider,
  useSidebar
} from '@/components/ui/sidebar'
import { AgentXContainer } from '@/containers/agent-x'
import { cn } from '@/lib/utils'

export type AgentXPage =
  | 'chat'
  | 'employees'
  | 'teams'
  | 'knowledge'
  | 'dashboard'
  | 'costs'

const pageTitles: Record<AgentXPage, string> = {
  chat: 'Groups',
  employees: 'Employees',
  teams: 'Teams',
  knowledge: 'Knowledge Base',
  dashboard: 'Dashboard',
  costs: 'Cost Analysis'
}

/**
 * Lives inside the SidebarProvider so it can pull the imperative setter.
 * Every time the active page becomes Groups we collapse the left rail to
 * give the three-column chat the full width; other pages leave whatever
 * the user last chose untouched.
 */
function CollapseSidebarOnChat({ activePage }: { activePage: AgentXPage }) {
  const { setOpen } = useSidebar()
  useEffect(() => {
    if (activePage === 'chat') setOpen(false)
  }, [activePage, setOpen])
  return null
}

export function AgentXLayout() {
  const [activePage, setActivePage] = useState<AgentXPage>('chat')

  return (
    <SidebarProvider defaultOpen={false}>
      <CollapseSidebarOnChat activePage={activePage} />
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
      <AppToaster />
    </SidebarProvider>
  )
}
