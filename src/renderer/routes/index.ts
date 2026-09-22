import { createHashRouter } from 'react-router'

import { RouteErrorBoundary } from '@/components/error-boundary'
import { ChatDetail } from '@/containers/chat-detail'
import { Home } from '@/containers/home'
import { ProjectDetail } from '@/containers/project-detail'
import { Layout as ChatLayout } from '@/layouts/chat-layout'

// Settings + Philharmonic are large feature surfaces (Monaco, recharts)
// that the user may never open. Defer them via React Router's `lazy` so chat —
// the default landing route — doesn't pay for their dependencies on cold start.
// HydrateFallback is required when the user lands directly on one of these
// hash routes; without it React Router warns and renders nothing.
const LazyRouteFallback = () => null

export const router = createHashRouter([
  {
    path: '/settings',
    HydrateFallback: LazyRouteFallback,
    ErrorBoundary: RouteErrorBoundary,
    lazy: () =>
      import('@/layouts/settings-layout').then((m) => ({
        Component: m.SettingsLayout
      }))
  },
  {
    path: '/philharmonic',
    HydrateFallback: LazyRouteFallback,
    ErrorBoundary: RouteErrorBoundary,
    lazy: () =>
      import('@/layouts/philharmonic-layout').then((m) => ({
        Component: m.PhilharmonicLayout
      }))
  },

  {
    // The `prototype` skill's surface: design directions behind a picker,
    // rendered in the app's real tokens. Nothing in the app links here;
    // deleted with the prototype once a direction is promoted.
    path: '/prototypes/weather',
    HydrateFallback: LazyRouteFallback,
    ErrorBoundary: RouteErrorBoundary,
    lazy: () =>
      import('@/prototypes/weather/page').then((m) => ({
        Component: m.WeatherPrototypes
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
