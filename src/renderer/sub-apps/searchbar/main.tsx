import '@/assets/stylesheets/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import React from 'react'
import ReactDOM from 'react-dom/client'
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
