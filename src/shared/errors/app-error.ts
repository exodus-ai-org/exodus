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
    super(message || AppError.interpolate(ErrorMessages[code], params))

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
   * Substitutes `{{key}}` placeholders in a default `ErrorMessages[code]`
   * template using `params` — plain string interpolation of already-known
   * English text, NOT an i18n lookup (translation happens only on the
   * display side, in `getHttpErrorMessage`).
   */
  private static interpolate(
    template: string,
    params?: Record<string, string | number>
  ): string {
    if (!params) return template
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      key in params ? String(params[key]) : match
    )
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

// Note: hasCustomMessage only signals "a message argument was passed to
// this constructor" — it is not a guarantee the text is meaningful to
// show untranslated to every user. toAppError() below wraps any
// unrecognized thrown value as InternalError(rawMessage), which sets
// hasCustomMessage: true and therefore displays that raw text verbatim
// (unchanged from pre-i18n behavior) — including raw driver/exception
// text a future pass may want to route through a generic translated
// fallback instead.
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error
  if (error instanceof Error) {
    return new InternalError(error.message)
  }
  return new InternalError(String(error))
}
