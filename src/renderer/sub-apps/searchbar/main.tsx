import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'

import { FindBar } from './app'

ReactDOM.createRoot(
  document.getElementById('searchbar-root') as HTMLElement
).render(
  <React.StrictMode>
    <ThemeProvider>
      <FindBar />
    </ThemeProvider>
  </React.StrictMode>
)
