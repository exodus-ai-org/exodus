import { useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useSettings } from '@/hooks/use-settings'
import { isFullTextSearchVisibleAtom, openTabsAtom } from '@/stores/chat'

const isMac = navigator.platform.toUpperCase().includes('MAC')

/** Readable modifier label for the current platform */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl'

export type ShortcutDef = {
  id: string
  keys: string[]
  label: string
  category: 'General' | 'Chat' | 'Search'
  /**
   * Defaults to true. Explicitly false for shortcuts that either have no
   * safe fallback if disabled (Enter to send, Shift+Enter for a new line)
   * or whose keybinding lives outside this hook — Toggle sidebar is wired
   * directly into the shadcn Sidebar primitive
   * (`components/ui/sidebar.tsx`), and Find in page is a native Electron
   * menu accelerator (`main/lib/menu.ts`) — so there's nothing here to gate.
   */
  toggleable?: boolean
}

/**
 * Static shortcut map consumed by both the hook and the Settings page.
 * `keys` uses a normalized format: modifier symbols + key name. `id` is a
 * stable key for persisting per-shortcut enabled/disabled state — never
 * rename an existing id, it's stored in settings.
 */
export const SHORTCUT_MAP: ShortcutDef[] = [
  {
    id: 'new-chat',
    keys: [MOD_KEY, 'N'],
    label: 'New chat',
    category: 'General'
  },
  {
    id: 'open-settings',
    keys: [MOD_KEY, ','],
    label: 'Open settings',
    category: 'General'
  },
  {
    id: 'toggle-sidebar',
    keys: [MOD_KEY, 'B'],
    label: 'Toggle sidebar',
    category: 'General',
    toggleable: false
  },
  {
    id: 'find-in-page',
    keys: [MOD_KEY, 'F'],
    label: 'Find in page',
    category: 'Search',
    toggleable: false
  },
  {
    id: 'search-chat-history',
    keys: [MOD_KEY, '⇧', 'F'],
    label: 'Search chat history',
    category: 'Search'
  },
  {
    id: 'close-find-bar',
    keys: ['Esc'],
    label: 'Close find bar',
    category: 'Search'
  },
  {
    id: 'close-tab',
    keys: [MOD_KEY, 'W'],
    label: 'Close current tab',
    category: 'Chat'
  },
  {
    id: 'focus-chat-input',
    keys: [MOD_KEY, '⇧', 'E'],
    label: 'Focus chat input',
    category: 'Chat'
  },
  {
    id: 'send-message',
    keys: ['Enter'],
    label: 'Send message',
    category: 'Chat',
    toggleable: false
  },
  {
    id: 'new-line',
    keys: ['⇧', 'Enter'],
    label: 'New line',
    category: 'Chat',
    toggleable: false
  }
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
  const { data: settings } = useSettings()
  const disabled = useMemo(
    () => new Set(settings?.keyboardShortcuts?.disabled ?? []),
    [settings?.keyboardShortcuts?.disabled]
  )

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Ignore events inside contentEditable / CodeMirror etc.
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // --- Escape: always works ---
      if (e.key === 'Escape') {
        if (disabled.has('close-find-bar')) return
        window.electron.ipcRenderer.invoke('close-search-bar')
        return
      }

      // --- Mod-key combos ---
      if (!isModKey(e)) return

      const key = e.key.toLowerCase()

      // Mod+Shift combos
      if (e.shiftKey) {
        if (key === 'f') {
          if (disabled.has('search-chat-history')) return
          e.preventDefault()
          setSearchVisible(true)
          return
        }
        if (key === 'e') {
          if (disabled.has('focus-chat-input')) return
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
        if (disabled.has('close-tab')) return
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
        if (disabled.has('new-chat')) return
        e.preventDefault()
        window.location.href = '/'
        return
      }

      if (key === ',') {
        if (disabled.has('open-settings')) return
        e.preventDefault()
        navigate('/settings')
        return
      }
    },
    [navigate, setSearchVisible, setOpenTabs, disabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
