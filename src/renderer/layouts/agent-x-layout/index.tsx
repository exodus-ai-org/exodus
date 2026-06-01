import { useState } from 'react'

import { AppToaster } from '@/components/app-toaster'
import { AgentXContainer } from '@/containers/agent-x'

export type AgentXPage = 'chat' | 'workforce' | 'knowledge' | 'dashboard'

export function AgentXLayout() {
  const [activePage, setActivePage] = useState<AgentXPage>('chat')
  return (
    <div className="bg-background flex h-screen min-h-0 w-screen flex-col overflow-hidden">
      <AgentXContainer activePage={activePage} onNavigate={setActivePage} />
      <AppToaster />
    </div>
  )
}
