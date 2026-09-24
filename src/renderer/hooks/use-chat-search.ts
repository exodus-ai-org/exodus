import type { ChatMessage } from '@exodus/shared/types/chat'
import { fetcher } from '@exodus/shared/utils/http'
import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/hooks/use-debounce'

export type ChatSearchHit = ChatMessage & { title: string; chatId: string }

export const chatSearchKeys = {
  all: ['chat-search'] as const,
  term: (term: string) => [...chatSearchKeys.all, term] as const
}

export function useChatSearch(query: string) {
  const term = useDebouncedValue(query)
  const { data } = useQuery({
    queryKey: chatSearchKeys.term(term),
    queryFn: () =>
      fetcher<ChatSearchHit[]>(
        `/api/v1/chat/search?query=${encodeURIComponent(term)}`
      ),
    // `term` lags `query` by the debounce: it is '' on the first keystroke, and
    // still the old term right after the input is cleared.
    enabled: !!query && !!term
  })
  // A disabled key still returns its cached data, so a cleared input reads
  // empty here rather than showing the previous results until `term` settles.
  return { data: query ? (data ?? []) : [] }
}
