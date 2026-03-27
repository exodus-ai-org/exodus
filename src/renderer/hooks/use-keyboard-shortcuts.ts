import { useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { isFullTextSearchVisibleAtom, openTabsAtom } from '@/stores/chat'

const isMac = navigator.platform.toUpperCase().includes('MAC')

/** Readable modifier label for the current platform */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl'

export type ShortcutDef = {
  keys: string[]
  label: string
  category: 'General' | 'Chat' | 'Search'
}

/**
 * Static shortcut map consumed by both the hook and the Settings page.
 * `keys` uses a normalized format: modifier symbols + key name.
 */
export const SHORTCUT_MAP: ShortcutDef[] = [
  { keys: [MOD_KEY, 'N'], label: 'New chat', category: 'General' },
  { keys: [MOD_KEY, ','], label: 'Open settings', category: 'General' },
  { keys: [MOD_KEY, 'B'], label: 'Toggle sidebar', category: 'General' },
  { keys: [MOD_KEY, 'F'], label: 'Find in page', category: 'Search' },
  {
    keys: [MOD_KEY, '⇧', 'F'],
    label: 'Search chat history',
    category: 'Search'
  },
  { keys: ['Esc'], label: 'Close find bar', category: 'Search' },
  { keys: [MOD_KEY, 'W'], label: 'Close current tab', category: 'Chat' },
  {
    keys: [MOD_KEY, '⇧', 'E'],
    label: 'Focus chat input',
    category: 'Chat'
  },
  { keys: ['Enter'], label: 'Send message', category: 'Chat' },
  { keys: ['⇧', 'Enter'], label: 'New line', category: 'Chat' }
]

function isModKey(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey
}

/**
 * Central keyboard shortcuts listener. Mount once at the ChatLayout level.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const setSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)
  const setOpenTabs = useSetAtom(openTabsAtom)

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Ignore events inside contentEditable / CodeMirror etc.
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // --- Escape: always works ---
      if (e.key === 'Escape') {
        window.electron.ipcRenderer.invoke('close-search-bar')
        return
      }

      // --- Mod-key combos ---
      if (!isModKey(e)) return

      const key = e.key.toLowerCase()

      // Mod+Shift combos
      if (e.shiftKey) {
        if (key === 'f') {
          e.preventDefault()
          setSearchVisible(true)
          return
        }
        if (key === 'e') {
          e.preventDefault()
          const textarea = document.querySelector<HTMLTextAreaElement>(
            'textarea[placeholder="Send a message..."]'
          )
          textarea?.focus()
          return
        }
        return
      }

      // Mod-only combos (skip if typing in inputs, except Mod+W which always works)
      if (key === 'w') {
        e.preventDefault()
        // Extract active tab id from URL hash: #/chat/:id
        const match = window.location.hash.match(/^#\/chat\/(.+)$/)
        if (!match) return
        const activeId = match[1]
        setOpenTabs((prev) => {
          const idx = prev.findIndex((t) => t.id === activeId)
          if (idx === -1) return prev
          const next = prev.filter((t) => t.id !== activeId)
          if (next.length > 0) {
            const target = next[Math.max(0, idx - 1)]
            navigate(`/chat/${target.id}`)
          } else {
            navigate('/')
          }
          return next
        })
        return
      }

      // For remaining shortcuts, skip if focused in an input
      if (isInput) return

      if (key === 'n') {
        e.preventDefault()
        window.location.href = '/'
        return
      }

      if (key === ',') {
        e.preventDefault()
        navigate('/settings')
        return
      }
    },
    [navigate, setSearchVisible, setOpenTabs]
  )

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
