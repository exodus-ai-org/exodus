import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'

import { reportRendererError } from '@/lib/report-error'

/**
 * A mutation's `meta`, read back by the global `mutationCache.onError`
 * below. `errorTitle` is the toast title on failure (falls back to a
 * generic one); `silent: true` skips the toast entirely (reporting still
 * happens — this never means "don't tell the log").
 */
export interface MutationMeta extends Record<string, unknown> {
  errorTitle?: string
  silent?: boolean
}

const GENERIC_ERROR_TITLE = 'Something went wrong'

/**
 * One QueryClient for the app, with two non-overlapping error surfaces:
 * reads report to the structured log only (a failed background read
 * shouldn't interrupt anyone); writes report *and* toast by default, since
 * a mutation is always something the user explicitly asked for. Neither
 * path can produce an unhandled rejection — React Query catches both
 * before they'd ever reach `installGlobalErrorReporting()`'s global
 * listeners, so there is no double-reporting between the two.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportRendererError('query', error, { queryKey: query.queryKey })
      }
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        reportRendererError('mutation', error, {
          mutationKey: mutation.options.mutationKey
        })
        const meta = mutation.meta as MutationMeta | undefined
        if (meta?.silent) return
        sileo.error({
          title: meta?.errorTitle ?? GENERIC_ERROR_TITLE,
          description: error instanceof Error ? error.message : String(error)
        })
      }
    }),
    defaultOptions: {
      queries: {
        // SWR's default: don't treat a background read failure as fatal to
        // the UI, and don't hammer the server — React Query's own default
        // (3 retries, exponential backoff) is fine to keep as-is.
        refetchOnWindowFocus: false
      }
    }
  })
}

export const queryClient = createAppQueryClient()
