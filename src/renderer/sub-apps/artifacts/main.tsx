import '@/assets/stylesheets/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { ArtifactSandbox } from './sandbox'

// Apply theme from localStorage (same key as main app's ThemeProvider).
// We don't use ThemeProvider here because it calls setNativeTheme via IPC,
// which is unavailable inside a sandboxed iframe without preload scripts.
function applyTheme() {
  const stored = window.localStorage.getItem('vite-ui-theme') ?? 'system'
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  if (stored === 'system') {
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(sys)
  } else {
    root.classList.add(stored)
  }
}

applyTheme()

// Listen for system theme changes
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', applyTheme)

ReactDOM.createRoot(
  document.getElementById('artifact-root') as HTMLElement
).render(
  <React.StrictMode>
    <ArtifactSandbox />
  </React.StrictMode>
)
