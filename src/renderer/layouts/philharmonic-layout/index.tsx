import { useState } from 'react'

import { AppToaster } from '@/components/app-toaster'
import { SidebarProvider } from '@/components/ui/sidebar'
import { PhilharmonicContainer } from '@/containers/philharmonic'

export type PhilharmonicPage = 'chat' | 'workforce' | 'dashboard'

export function PhilharmonicLayout() {
  const [activePage, setActivePage] = useState<PhilharmonicPage>('chat')
  return (
    <SidebarProvider>
      <PhilharmonicContainer
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <AppToaster />
    </SidebarProvider>
  )
}
