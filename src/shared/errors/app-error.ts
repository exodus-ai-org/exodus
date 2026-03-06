import {
  ErrorCode,
  ErrorCodeToStatus,
  ErrorMessages
} from '../constants/error-codes'

/**
 * Base application error class
 * All custom errors should extend from this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly metadata?: Record<string, unknown>
  public readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message?: string,
    metadata?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message || ErrorMessages[code])

    this.name = this.constructor.name
    this.code = code
    this.statusCode = ErrorCodeToStatus[code]
    this.metadata = metadata
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Serialize error for sending to client
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        metadata: this.metadata
      }
    }
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.CONFIG_INVALID,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * External service errors
 */
export class ServiceError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.DB_QUERY_FAILED,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * File operation errors
 */
export class FileError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.FILE_READ_FAILED,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * AI/Model errors
 */
export class AIError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.AI_GENERATION_FAILED,
    message?: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata)
  }
}

/**
 * Internal server errors
 */
export class InternalError extends AppError {
  constructor(message?: string, metadata?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL_ERROR, message, metadata, false)
  }
}

/**
 * Helper function to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Helper function to convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new InternalError(error.message, {
      originalError: error.name,
      stack: error.stack
    })
  }

  return new InternalError('An unknown error occurred', {
    error: String(error)
  })
}
