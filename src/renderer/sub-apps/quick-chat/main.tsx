import '@/assets/stylesheets/globals.css'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { I18nProvider } from '@/components/i18n-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { i18nReady } from '@/lib/i18n'
import { createAppQueryClient } from '@/lib/query-client'
import { installGlobalErrorReporting } from '@/lib/report-error'
import { bootTone, subscribeToneCache } from '@/lib/tone'

import { QuickChat } from './app'

// Same-origin localStorage is shared with the main window: apply its cached
// colour tone now and follow later changes via the `storage` event.
bootTone()
subscribeToneCache(bootTone)
installGlobalErrorReporting()

// `I18nProvider` follows `settings.language` through `useSettings()`, a React
// Query hook: without a client of its own this window throws "No QueryClient
// set" on mount and stays blank. Its own client, not the main window's — this
// is a separate renderer process.
const queryClient = createAppQueryClient()

void i18nReady.finally(() => {
  ReactDOM.createRoot(
    document.getElementById('quick-chat-root') as HTMLElement
  ).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <QuickChat />
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  )
})
