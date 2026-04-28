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

// globals.css sets `body { bg-transparent }` for the main app — but in a
// sandboxed iframe with no explicit surface, that lets the browser's default
// white show through, making dark-mode text unreadable when an LLM-authored
// artifact omits its own background. Override here so the iframe's surface
// always tracks the theme.
document.body.classList.add('bg-background')

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
