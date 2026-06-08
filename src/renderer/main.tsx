import '@/assets/stylesheets/globals.css'
import { fetcher } from '@shared/utils/http'
import { Provider } from 'jotai'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

import 'react-medium-image-zoom/dist/styles.css'
import { LockScreen } from '@/components/lock/lock-screen'
import { ThemeProvider } from '@/components/theme-provider'
import { useLock } from '@/hooks/use-lock'
import { router } from '@/routes'

function AppRoot() {
  const { status, refresh, locked } = useLock()

  if (status && locked) {
    return <LockScreen status={status} onUnlocked={refresh} />
  }

  return <RouterProvider router={router} />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <SWRConfig value={{ fetcher }}>
    <Provider>
      <ThemeProvider>
        <AppRoot />
      </ThemeProvider>
    </Provider>
  </SWRConfig>
)
