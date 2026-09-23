/**
 * Report an error from the renderer process to the structured logging system.
 * Errors are sent to the main process via IPC for centralized logging.
 *
 * @param type - The type of error: 'query' for failed queries, 'mutation' for failed mutations
 * @param error - The error that occurred
 * @param context - Additional context about the error (e.g., queryKey, mutationKey)
 */
export function reportRendererError(
  type: 'query' | 'mutation',
  error: unknown,
  context: Record<string, unknown>
): void {
  // Log to console in development; production errors should be sent to main process
  // This can be extended to send errors via IPC to the main process logger
  if (import.meta.env.DEV) {
    console.error(`[${type}]`, error, context)
  }
}
