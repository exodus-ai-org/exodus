import { useSyncExternalStore } from 'react'

/**
 * Which renderer the chat's Markdown goes through — an experiment switch
 * (Settings → Developer → Experiments), kept in this window's localStorage
 * rather than in Settings: it is a renderer-only preference for comparing the
 * two side by side, not something the main process or another device needs.
 *
 * - `exodus` — react-markdown + the block splitter (`components/markdown.tsx`)
 * - `streamdown` — Vercel's streamdown with its shiki and KaTeX plugins
 *   (`components/markdown-streamdown.tsx`), loaded on first use
 */
export type MarkdownEngine = 'exodus' | 'streamdown'

export const MARKDOWN_ENGINE_STORAGE_KEY = 'exodus-markdown-engine'
export const DEFAULT_MARKDOWN_ENGINE: MarkdownEngine = 'exodus'
export const MARKDOWN_ENGINES: readonly MarkdownEngine[] = [
  'exodus',
  'streamdown'
]

const CHANGE_EVENT = 'exodus:markdown-engine'

function isEngine(value: unknown): value is MarkdownEngine {
  return typeof value === 'string' && MARKDOWN_ENGINES.includes(value as never)
}

export function getMarkdownEngine(): MarkdownEngine {
  try {
    const cached = window.localStorage.getItem(MARKDOWN_ENGINE_STORAGE_KEY)
    return isEngine(cached) ? cached : DEFAULT_MARKDOWN_ENGINE
  } catch {
    return DEFAULT_MARKDOWN_ENGINE
  }
}

export function setMarkdownEngine(engine: MarkdownEngine): void {
  try {
    window.localStorage.setItem(MARKDOWN_ENGINE_STORAGE_KEY, engine)
  } catch {
    // Blocked storage: the change still reaches this window's subscribers.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void): () => void {
  // Same-window changes come through the custom event; another window's
  // (a sub-app's) through `storage`.
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The current engine; re-renders when it changes. */
export function useMarkdownEngine(): MarkdownEngine {
  return useSyncExternalStore(
    subscribe,
    getMarkdownEngine,
    () => DEFAULT_MARKDOWN_ENGINE
  )
}
