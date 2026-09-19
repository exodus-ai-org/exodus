import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { I18nProvider } from '@/components/i18n-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { bootAppearance, subscribeAppearanceCache } from '@/lib/appearance'
import { i18nReady } from '@/lib/i18n'

import { QuickChat } from './app'

// Same-origin localStorage is shared with the main window: apply its cached
// appearance now and follow later changes via the `storage` event.
bootAppearance()
subscribeAppearanceCache(bootAppearance)

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
