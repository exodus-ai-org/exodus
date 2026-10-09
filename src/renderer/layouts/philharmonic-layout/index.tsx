import { useState } from 'react'

import { AppToaster } from '@/components/app/app-toaster'
import { SidebarProvider } from '@/components/ui/sidebar'
import { PhilharmonicContainer } from '@/containers/philharmonic'
import { useRouteHistoryRecorder } from '@/hooks/use-route-history'

export type PhilharmonicPage = 'chat' | 'workforce' | 'dashboard'

export function PhilharmonicLayout() {
  const [activePage, setActivePage] = useState<PhilharmonicPage>('chat')
  // Philharmonic is a page of the arrows' history too, now that its bars
  // carry them as Chat's do: back from here returns to the chat you left.
  useRouteHistoryRecorder()
  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <PhilharmonicContainer
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <AppToaster />
    </SidebarProvider>
  )
}
