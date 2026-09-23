import type { ParseKeys } from 'i18next'
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
  labelKey: ParseKeys<'settings'>
  category: 'General' | 'Chat' | 'Search'
  /**
   * Defaults to true. Explicitly false for shortcuts that either have no
   * safe fallback if disabled (Enter to send, Shift+Enter for a new line)
   * or whose keybinding lives outside this hook — Toggle sidebar is wired
   * directly into the shadcn Sidebar primitive
   * (`components/ui/sidebar.tsx`), and Find in page and Lock Now are native
   * Electron menu accelerators (`main/lib/menu.ts`) — so there's nothing
   * here to gate.
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
    labelKey: 'keyboardShortcuts.shortcuts.new-chat.label',
    category: 'General'
  },
  {
    id: 'open-settings',
    keys: [MOD_KEY, ','],
    labelKey: 'keyboardShortcuts.shortcuts.open-settings.label',
    category: 'General'
  },
  {
    id: 'toggle-sidebar',
    keys: [MOD_KEY, 'B'],
    labelKey: 'keyboardShortcuts.shortcuts.toggle-sidebar.label',
    category: 'General',
    toggleable: false
  },
  {
    id: 'lock-now',
    keys: [MOD_KEY, 'L'],
    labelKey: 'keyboardShortcuts.shortcuts.lock-now.label',
    category: 'General',
    toggleable: false
  },
  {
    id: 'toggle-developer-tools',
    keys: [MOD_KEY, 'Alt', 'I'],
    labelKey: 'keyboardShortcuts.shortcuts.toggle-developer-tools.label',
    category: 'General',
    toggleable: false
  },
  {
    id: 'force-refresh-page',
    keys: [MOD_KEY, 'Shift', 'R'],
    labelKey: 'keyboardShortcuts.shortcuts.force-refresh-page.label',
    category: 'General',
    toggleable: false
  },
  {
    id: 'find-in-page',
    keys: [MOD_KEY, 'F'],
    labelKey: 'keyboardShortcuts.shortcuts.find-in-page.label',
    category: 'Search',
    toggleable: false
  },
  {
    id: 'search-chat-history',
    keys: [MOD_KEY, '⇧', 'F'],
    labelKey: 'keyboardShortcuts.shortcuts.search-chat-history.label',
    category: 'Search'
  },
  {
    id: 'close-find-bar',
    keys: ['Esc'],
    labelKey: 'keyboardShortcuts.shortcuts.close-find-bar.label',
    category: 'Search'
  },
  {
    id: 'close-tab',
    keys: [MOD_KEY, 'W'],
    labelKey: 'keyboardShortcuts.shortcuts.close-tab.label',
    category: 'Chat'
  },
  {
    id: 'focus-chat-input',
    keys: [MOD_KEY, '⇧', 'E'],
    labelKey: 'keyboardShortcuts.shortcuts.focus-chat-input.label',
    category: 'Chat'
  },
  {
    id: 'send-message',
    keys: ['Enter'],
    labelKey: 'keyboardShortcuts.shortcuts.send-message.label',
    category: 'Chat',
    toggleable: false
  },
  {
    id: 'new-line',
    keys: ['⇧', 'Enter'],
    labelKey: 'keyboardShortcuts.shortcuts.new-line.label',
    category: 'Chat',
    toggleable: false
  }
]

/**
 * i18n key for each shortcut category heading, keyed by
 * `ShortcutDef['category']` the same way `NAV_TITLE_KEYS`
 * (`settings-menu.ts`) keys off `SettingsLabel` — `as const satisfies
 * Record<...>` keeps each value's exact literal key type so
 * `t(CATEGORY_TITLE_KEYS[category])` type-checks with no cast.
 */
export const CATEGORY_TITLE_KEYS = {
  General: 'keyboardShortcuts.category.general',
  Chat: 'keyboardShortcuts.category.chat',
  Search: 'keyboardShortcuts.category.search'
} as const satisfies Record<ShortcutDef['category'], ParseKeys<'settings'>>

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
        navigate('/')
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
