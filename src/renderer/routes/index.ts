import { createHashRouter } from 'react-router'

import { RouteErrorBoundary } from '@/components/error-boundary'
import { ChatDetail } from '@/containers/chat-detail'
import { Home } from '@/containers/home'
import { AgentXLayout } from '@/layouts/agent-x-layout'
import { Layout as ChatLayout } from '@/layouts/chat-layout'
import { SettingsLayout } from '@/layouts/settings-layout'

export const router = createHashRouter([
  { path: '/settings', Component: SettingsLayout },
  { path: '/agent-x', Component: AgentXLayout },

  {
    Component: ChatLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { path: '/', Component: Home },
      {
        path: '/chat/:id',
        Component: ChatDetail,
        ErrorBoundary: RouteErrorBoundary
      }
    ]
  }
])
