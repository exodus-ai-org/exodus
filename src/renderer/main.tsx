import '@/assets/stylesheets/globals.css'
import { fetcher } from '@exodus/shared/utils/http'
import { Provider } from 'jotai'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

import 'react-medium-image-zoom/dist/styles.css'
import { AppearanceProvider } from '@/components/appearance-provider'
import { I18nProvider } from '@/components/i18n-provider'
import { LockScreen } from '@/components/lock/lock-screen'
import { ThemeProvider } from '@/components/theme-provider'
import { useLock } from '@/hooks/use-lock'
import { bootAppearance } from '@/lib/appearance'
import { i18nReady } from '@/lib/i18n'
import { router } from '@/routes'

// First paint already carries the user's theme: apply the cached appearance
// synchronously, before anything renders. The provider below keeps it live.
bootAppearance()

function AppRoot() {
  const { status, refresh, locked } = useLock()

  if (status === null) return null
  if (locked) return <LockScreen status={status} onUnlocked={refresh} />
  return <RouterProvider router={router} />
}

void i18nReady.finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <SWRConfig value={{ fetcher }}>
      <Provider>
        <ThemeProvider>
          <I18nProvider>
            <AppearanceProvider />
            <AppRoot />
          </I18nProvider>
        </ThemeProvider>
      </Provider>
    </SWRConfig>
  )
})
