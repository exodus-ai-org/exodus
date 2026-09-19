import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { I18nProvider } from '@/components/i18n-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { i18nReady } from '@/lib/i18n'

import { SearchBar } from './app'

void i18nReady.finally(() => {
  ReactDOM.createRoot(
    document.getElementById('searchbar-root') as HTMLElement
  ).render(
    <React.StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <SearchBar />
        </I18nProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})
