import { RouteErrorBoundary } from '@/components/error-boundary'
import { ChatDetail } from '@/containers/chat-detail'
import { Home } from '@/containers/home'
import { AgentXLayout } from '@/layouts/agent-x-layout'
import { Layout as ChatLayout } from '@/layouts/chat-layout'
import { SettingsLayout } from '@/layouts/settings-layout'
import { SkillsMarketLayout } from '@/layouts/skills-market-layout'
import { createHashRouter } from 'react-router'

export const router = createHashRouter([
  { path: '/settings', Component: SettingsLayout },
  { path: '/skills-market', Component: SkillsMarketLayout },
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
