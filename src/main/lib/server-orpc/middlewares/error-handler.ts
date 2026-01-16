import { os } from '@orpc/server'
import { toAppError } from '@shared/errors'

/**
 * Global error handler middleware for ORPC
 * Catches all errors and converts them to a consistent format
 */
export const withErrorHandler = os.middleware(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    // Convert to AppError if not already
    const appError = toAppError(error)

    // Log error (in production, you might want to use a proper logger)
    console.error('[ORPC Error]', {
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
      metadata: appError.metadata,
      stack: appError.stack
    })

    // Throw the error with structured data
    // ORPC will serialize this properly
    throw new Error(JSON.stringify(appError.toJSON()))
  }
})
