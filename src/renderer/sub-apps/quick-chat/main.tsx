import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { I18nProvider } from '@/components/i18n-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { i18nReady } from '@/lib/i18n'
import { bootTone, subscribeToneCache } from '@/lib/tone'

import { QuickChat } from './app'

// Same-origin localStorage is shared with the main window: apply its cached
// colour tone now and follow later changes via the `storage` event.
bootTone()
subscribeToneCache(bootTone)

void i18nReady.finally(() => {
  ReactDOM.createRoot(
    document.getElementById('quick-chat-root') as HTMLElement
  ).render(
    <React.StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <QuickChat />
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})
