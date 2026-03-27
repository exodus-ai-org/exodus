import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'

import { QuickChat } from './app'

ReactDOM.createRoot(
  document.getElementById('quick-chat-root') as HTMLElement
).render(
  <React.StrictMode>
    <ThemeProvider>
      <QuickChat />
    </ThemeProvider>
  </React.StrictMode>
)
