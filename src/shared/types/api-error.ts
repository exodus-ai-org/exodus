import type { ErrorCode } from '../constants/error-codes'

/**
 * Structure of API errors returned from the server
 */
export interface APIErrorResponse {
  error: {
    code: ErrorCode
    message: string
    statusCode: number
    metadata?: Record<string, unknown>
  }
}

/**
 * Parsed API error for client-side handling
 */
export class APIError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly metadata?: Record<string, unknown>

  constructor(response: APIErrorResponse['error']) {
    super(response.message)
    this.name = 'APIError'
    this.code = response.code
    this.statusCode = response.statusCode
    this.metadata = response.metadata

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }

  /**
   * Check if error is a specific error code
   */
  is(code: ErrorCode): boolean {
    return this.code === code
  }

  /**
   * Check if error is a configuration error
   */
  isConfigError(): boolean {
    return this.code.startsWith('CONFIG_')
  }

  /**
   * Check if error is a not found error
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.code.startsWith('VALIDATION_')
  }

  /**
   * Check if error is a service error
   */
  isServiceError(): boolean {
    return this.code.startsWith('SERVICE_')
  }

  /**
   * Check if error is a database error
   */
  isDatabaseError(): boolean {
    return this.code.startsWith('DB_')
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message
  }
}

/**
 * Type guard to check if an error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError
}

/**
 * Parse error from ORPC/fetch response
 */
export function parseAPIError(error: unknown): APIError {
  // If it's already an APIError, return it
  if (isAPIError(error)) {
    return error
  }

  // Try to parse ORPC error (JSON string in error message)
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as APIErrorResponse
      if (parsed.error && parsed.error.code) {
        return new APIError(parsed.error)
      }
    } catch {
      // Not a JSON error, fall through
    }
  }

  // Default error
  return new APIError({
    code: 'UNKNOWN_ERROR' as ErrorCode,
    message:
      error instanceof Error ? error.message : 'An unknown error occurred',
    statusCode: 500
  })
}

/**
 * Handle API error with optional custom handlers
 */
export function handleAPIError(
  error: unknown,
  handlers?: Partial<Record<ErrorCode, (error: APIError) => void>>
): void {
  const apiError = parseAPIError(error)

  // Call specific handler if available
  if (handlers && handlers[apiError.code]) {
    handlers[apiError.code]!(apiError)
    return
  }

  // Default handling
  console.error('[API Error]', {
    code: apiError.code,
    message: apiError.message,
    statusCode: apiError.statusCode,
    metadata: apiError.metadata
  })
}
