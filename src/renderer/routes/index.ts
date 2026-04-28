import { createHashRouter } from 'react-router'

import { RouteErrorBoundary } from '@/components/error-boundary'
import { ChatDetail } from '@/containers/chat-detail'
import { Home } from '@/containers/home'
import { ProjectDetail } from '@/containers/project-detail'
import { Layout as ChatLayout } from '@/layouts/chat-layout'

// Settings + AgentX are large feature surfaces (Monaco, recharts, @xyflow, dnd-kit)
// that the user may never open. Defer them via React Router's `lazy` so chat —
// the default landing route — doesn't pay for their dependencies on cold start.
// HydrateFallback is required when the user lands directly on one of these
// hash routes; without it React Router warns and renders nothing.
const LazyRouteFallback = () => null

export const router = createHashRouter([
  {
    path: '/settings',
    HydrateFallback: LazyRouteFallback,
    lazy: () =>
      import('@/layouts/settings-layout').then((m) => ({
        Component: m.SettingsLayout
      }))
  },
  {
    path: '/agent-x',
    HydrateFallback: LazyRouteFallback,
    lazy: () =>
      import('@/layouts/agent-x-layout').then((m) => ({
        Component: m.AgentXLayout
      }))
  },

  {
    Component: ChatLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { path: '/', Component: Home },
      {
        path: '/chat/:id',
        Component: ChatDetail,
        ErrorBoundary: RouteErrorBoundary
      },
      {
        path: '/project/:id',
        Component: ProjectDetail,
        ErrorBoundary: RouteErrorBoundary
      }
    ]
  }
])
