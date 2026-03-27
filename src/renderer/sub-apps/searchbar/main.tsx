import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'

import { SearchBar } from './app'

ReactDOM.createRoot(
  document.getElementById('searchbar-root') as HTMLElement
).render(
  <React.StrictMode>
    <ThemeProvider>
      <SearchBar />
    </ThemeProvider>
  </React.StrictMode>
)
