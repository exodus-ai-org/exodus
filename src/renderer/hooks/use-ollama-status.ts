import { fetcher } from '@exodus/shared/utils/http'
import { useQuery } from '@tanstack/react-query'

export const ollamaStatusKeys = {
  all: ['ollama-status'] as const,
  baseUrl: (baseUrl: string) => [...ollamaStatusKeys.all, baseUrl] as const
}

async function pingOllama(baseUrl: string): Promise<boolean> {
  // "Unreachable" is the answer this probe exists to give, not a failure: a
  // rejecting queryFn would be retried with backoff (a red dot ~7 s late) and
  // reported to the log for every half-typed URL.
  try {
    await fetcher(
      `/api/v1/tools/ping-ollama?url=${encodeURIComponent(baseUrl)}`
    )
    return true
  } catch {
    return false
  }
}

export function useOllamaStatus(baseUrl: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ollamaStatusKeys.baseUrl(baseUrl ?? ''),
    queryFn: () => pingOllama(baseUrl!),
    enabled: !!baseUrl
  })
  // Running until proven otherwise, so the dot does not flash red while the
  // first ping is in flight.
  return { isRunning: !!baseUrl && data !== false }
}
