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

  constructor(code: ErrorCode, message?: string, isOperational = true) {
    super(message || ErrorMessages[code])

    this.name = this.constructor.name
    this.code = code
    this.statusCode = ErrorCodeToStatus[code]
    this.isOperational = isOperational

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Serialize to Anthropic-style JSON for HTTP responses.
   *
   * ```json
   * { "type": "error", "error": { "code": "CHAT_NOT_FOUND", "message": "Chat not found." } }
   * ```
   */
  toJSON() {
    return {
      type: 'error' as const,
      error: {
        code: this.code,
        message: this.message
      }
    }
  }
}

// ── Typed subclasses ─────────────────────────────────────────────────────────

export class ConfigurationError extends AppError {
  constructor(code: ErrorCode = ErrorCode.CONFIG_INVALID, message?: string) {
    super(code, message)
  }
}

export class NotFoundError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message?: string
  ) {
    super(code, message)
  }
}

export class ValidationError extends AppError {
  constructor(code: ErrorCode = ErrorCode.VALIDATION_FAILED, message?: string) {
    super(code, message)
  }
}

export class RateLimitError extends AppError {
  constructor(code: ErrorCode = ErrorCode.RATE_LIMIT_CHAT, message?: string) {
    super(code, message)
  }
}

export class ServiceError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    message?: string
  ) {
    super(code, message)
  }
}

export class DatabaseError extends AppError {
  constructor(code: ErrorCode = ErrorCode.DB_QUERY_FAILED, message?: string) {
    super(code, message)
  }
}

export class FileError extends AppError {
  constructor(code: ErrorCode = ErrorCode.FILE_READ_FAILED, message?: string) {
    super(code, message)
  }
}

export class AIError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.AI_GENERATION_FAILED,
    message?: string
  ) {
    super(code, message)
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
