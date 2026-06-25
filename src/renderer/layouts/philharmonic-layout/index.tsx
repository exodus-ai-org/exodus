import { useState } from 'react'

import { AppToaster } from '@/components/app-toaster'
import { PhilharmonicContainer } from '@/containers/philharmonic'

export type PhilharmonicPage = 'chat' | 'workforce' | 'knowledge' | 'dashboard'

export function PhilharmonicLayout() {
  const [activePage, setActivePage] = useState<PhilharmonicPage>('chat')
  return (
    <div className="bg-background flex h-screen min-h-0 w-screen flex-col overflow-hidden">
      <PhilharmonicContainer
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <AppToaster />
    </div>
  )
}
