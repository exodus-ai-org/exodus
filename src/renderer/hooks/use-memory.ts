import type { MemoryChange, UsedMemory } from '@exodus/shared/types/memory'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { i18n } from '@/lib/i18n'
import {
  getMemories,
  getMemoryUsage,
  undoMemoryChanges,
  type MemoryItem
} from '@/services/memory'

export const memoryKeys = {
  all: ['memory'] as const,
  list: ['memory', 'list'] as const,
  usage: (chatId: string) => ['memory', 'usage', chatId] as const
}

export function useMemories() {
  const { data, isLoading } = useQuery({
    queryKey: memoryKeys.list,
    queryFn: () => getMemories(),
    // The chat's `update_memory` tool and background consolidation both
    // write memory without this page open; coming back to the window is
    // when the user would look for what changed (same reasoning as
    // devices/installed skills — see CLAUDE.md "Server state").
    refetchOnWindowFocus: true
  })
  return { data, isLoading }
}

// A stable empty array: falling back to a fresh `[]` on every read would
// fail reference equality on every render and defeat the point of `select`
// below — a hook mounted for one run would re-render whenever ANY run's
// usage changed, not just its own.
const NO_USAGE: UsedMemory[] = []

/** Which memories one run of a chat used, read from the whole-chat usage
 *  record (`GET /api/v1/memory/usage?chatId=`) that the chat SSE stream
 *  also writes into live (`stream-manager.ts`'s `memories_used` handling) —
 *  narrowed here to a single run so a foot line only re-renders for its own
 *  run's data. */
export function useRunMemoryUsage(chatId: string, runId: string): UsedMemory[] {
  const { data } = useQuery({
    queryKey: memoryKeys.usage(chatId),
    queryFn: () => getMemoryUsage(chatId),
    enabled: Boolean(chatId),
    select: (usage) => usage[runId] ?? NO_USAGE
  })
  return data ?? NO_USAGE
}

/** The Memory settings page's local edits to the cached list — `set`
 *  replaces the old `setMemories(updater)`/`patchLocal` local state,
 *  `invalidate` replaces the old `load()` re-fetch after a write. */
export function useSetMemoryList() {
  const queryClient = useQueryClient()
  const set = useCallback(
    async (updater: (list: MemoryItem[]) => MemoryItem[]) => {
      // `useMemories()` carries `refetchOnWindowFocus: true` — a read
      // already in flight (the window regaining focus while this write
      // happens) would otherwise land afterwards with the pre-write list
      // and silently revert it (a toggle flips back, a deleted row
      // reappears). Cancel it first, same guard `use-settings.ts`'s save
      // and `useRefreshDiscoverFeed` use before their own `setQueryData`.
      await queryClient.cancelQueries({ queryKey: memoryKeys.list })
      queryClient.setQueryData<MemoryItem[]>(memoryKeys.list, (old) =>
        updater(old ?? [])
      )
    },
    [queryClient]
  )
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: memoryKeys.list }),
    [queryClient]
  )
  return { set, invalidate }
}

export function useUndoMemoryChanges() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: MemoryChange[]) => undoMemoryChanges(changes),
    // The global mutation handler is the only error surface — a local catch
    // and toast would make one failed undo toast twice.
    meta: { errorTitle: i18n.t('chat:memoryStrip.undoFailed') },
    // Returned, not voided: whatever changed server-side (undone or
    // skipped), the memory queries this run touched are stale either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: memoryKeys.all })
  })
}
