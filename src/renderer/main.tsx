import '@/assets/stylesheets/globals.css'
import { fetcher } from '@exodus/shared/utils/http'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider } from 'jotai'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

import 'react-medium-image-zoom/dist/styles.css'
import { I18nProvider } from '@/components/i18n-provider'
import { LockScreen } from '@/components/lock/lock-screen'
import { ThemeProvider } from '@/components/theme-provider'
import { ToneBridge } from '@/components/tone-bridge'
import { useLock } from '@/hooks/use-lock'
import { i18nReady } from '@/lib/i18n'
import { installMenuBridge } from '@/lib/menu-bridge'
import { queryClient } from '@/lib/query-client'
import { installGlobalErrorReporting } from '@/lib/report-error'
import { bootTone } from '@/lib/tone'
import { router } from '@/routes'

// First paint already carries the user's colour tone: apply the cached value
// synchronously, before anything renders. ToneBridge keeps it live.
bootTone()
// Catches what no ErrorBoundary in the tree below can — see its docstring.
installGlobalErrorReporting()
// New Chat / Settings… on the native menu — see menu-bridge.ts.
installMenuBridge()

function AppRoot() {
  const { status, refresh, locked } = useLock()

  if (status === null) return null
  if (locked) return <LockScreen status={status} onUnlocked={refresh} />
  return <RouterProvider router={router} />
}

void i18nReady.finally(() => {
  ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={{ fetcher }}>
        <Provider>
          <ThemeProvider>
            <I18nProvider>
              <ToneBridge />
              <AppRoot />
            </I18nProvider>
          </ThemeProvider>
        </Provider>
      </SWRConfig>
      {import.meta.env.DEV && (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
})
