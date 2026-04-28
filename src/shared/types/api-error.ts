import { HttpError } from '@shared/utils/http'

/**
 * Re-export HttpError as the canonical API error type for the renderer.
 * This is the error thrown by `fetcher()` when the server returns an error response.
 *
 * Shape mirrors Anthropic-style errors:
 * - `code`      — e.g. "CHAT_NOT_FOUND", "VALIDATION_FAILED"
 * - `message`   — human-readable description
 * - `statusCode` — HTTP status
 */
export { HttpError as APIError }

/**
 * Type guard to check if an error is an API error from the server.
 */
export function isAPIError(error: unknown): error is HttpError {
  return error instanceof HttpError
}
