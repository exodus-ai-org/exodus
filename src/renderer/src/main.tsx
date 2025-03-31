import '@/assets/stylesheets/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { router } from '@/routes'
import { Provider } from 'jotai'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
)
