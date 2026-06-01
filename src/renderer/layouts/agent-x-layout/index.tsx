import { useEffect, useRef, useState } from 'react'

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

export type AgentXPage = 'chat' | 'workforce' | 'knowledge' | 'dashboard'

const pageTitles: Record<AgentXPage, string> = {
  chat: 'Groups',
  workforce: 'Workforce',
  knowledge: 'Knowledge Base',
  dashboard: 'Dashboard'
}

/**
 * Lives inside the SidebarProvider so it can pull the imperative setter.
 * Only fires when the active page TRANSITIONS into Groups — so a user
 * clicking the expand button while already on Groups isn't immediately
 * slammed shut again.
 *
 * Sidebar's `setOpen` is wrapped in a useCallback whose deps include the
 * current `open` state, so its identity flips every toggle. If we put
 * `setOpen` in the deps array of this effect, every expand would re-run
 * the effect and force-close us — that's the bug. We hold setOpen in a
 * ref instead and gate on the prev→curr page transition.
 */
function CollapseSidebarOnChat({ activePage }: { activePage: AgentXPage }) {
  const { setOpen } = useSidebar()
  const setOpenRef = useRef(setOpen)
  setOpenRef.current = setOpen
  const prevPageRef = useRef<AgentXPage | null>(null)

  useEffect(() => {
    if (prevPageRef.current !== 'chat' && activePage === 'chat') {
      setOpenRef.current(false)
    }
    prevPageRef.current = activePage
  }, [activePage])

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
