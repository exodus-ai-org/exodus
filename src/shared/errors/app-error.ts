import {
  ErrorCode,
  ErrorCodeToStatus,
  ErrorMessages
} from '../constants/error-codes'

/**
 * Base application error class.
 *
 * Follows Anthropic-style error response format:
 * { type: "error", error: { code: "ERROR_CODE", message: "..." } }
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly params?: Record<string, string | number>
  public readonly hasCustomMessage: boolean

  constructor(
    code: ErrorCode,
    message?: string,
    isOperational = true,
    params?: Record<string, string | number>
  ) {
    super(message || ErrorMessages[code])

    this.name = this.constructor.name
    this.code = code
    this.statusCode = ErrorCodeToStatus[code]
    this.isOperational = isOperational
    this.params = params
    this.hasCustomMessage = message !== undefined

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Serialize to Anthropic-style JSON for HTTP responses.
   *
   * ```json
   * { "type": "error", "error": { "code": "CHAT_NOT_FOUND", "message": "Chat not found.", "hasCustomMessage": true } }
   * ```
   *
   * `params` is present only when the constructor received one; the
   * renderer's `getHttpErrorMessage` uses `hasCustomMessage` to decide
   * whether to show `message` verbatim or translate `code` + `params`.
   */
  toJSON() {
    return {
      type: 'error' as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.params !== undefined ? { params: this.params } : {}),
        hasCustomMessage: this.hasCustomMessage
      }
    }
  }
}

// ── Typed subclasses ─────────────────────────────────────────────────────────

export class ConfigurationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.CONFIG_INVALID,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class NotFoundError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class ValidationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class RateLimitError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.RATE_LIMIT_CHAT,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class ServiceError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.DB_QUERY_FAILED,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class FileError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.FILE_READ_FAILED,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class AIError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.AI_GENERATION_FAILED,
    message?: string,
    params?: Record<string, string | number>
  ) {
    super(code, message, true, params)
  }
}

export class InternalError extends AppError {
  constructor(message?: string) {
    super(ErrorCode.INTERNAL_ERROR, message, false)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error
  if (error instanceof Error) {
    return new InternalError(error.message)
  }
  return new InternalError(String(error))
}
