import { fetcher } from '@exodus/shared/utils/http'

/**
 * Sends an error the renderer caught to the main process's log
 * (`POST /api/v1/logs` → `renderer/<scope>` in the JSONL the Logger tab
 * reads). Fire and forget: reporting must never add a failure of its own,
 * so a refused request is dropped silently.
 */
export function reportRendererError(
  scope: string,
  error: unknown,
  attributes: Record<string, unknown> = {}
): void {
  const message =
    error instanceof Error ? error.message : String(error ?? 'unknown')
  const stack = error instanceof Error ? error.stack : undefined
  fetcher<void>('/api/v1/logs', {
    method: 'POST',
    body: {
      level: 'error',
      scope,
      message,
      attributes: stack ? { ...attributes, stack } : attributes
    },
    responseType: 'text'
  }).catch(() => {})
}
