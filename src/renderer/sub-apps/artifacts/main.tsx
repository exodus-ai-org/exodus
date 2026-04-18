import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'

import { ArtifactSandbox } from './sandbox'

ReactDOM.createRoot(
  document.getElementById('artifact-root') as HTMLElement
).render(
  <React.StrictMode>
    <ThemeProvider>
      <ArtifactSandbox />
    </ThemeProvider>
  </React.StrictMode>
)
