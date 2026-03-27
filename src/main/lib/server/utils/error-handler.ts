import z from 'zod'

import { ChatSDKError, Surface } from '../errors'

/**
 * Wraps database operations with error handling
 */
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      error instanceof Error ? error.message : errorMessage
    )
  }
}

/**
 * Wraps route handler with consistent error handling
 */
export function wrapRouteHandler<T>(
  handler: () => Promise<T>,
  surface: Surface,
  errorMessage?: string
) {
  return async (): Promise<T> => {
    try {
      return await handler()
    } catch (error) {
      if (error instanceof ChatSDKError) throw error
      throw new ChatSDKError(
        `bad_request:${surface}`,
        error instanceof Error
          ? error.message
          : errorMessage || 'Operation failed'
      )
    }
  }
}

/**
 * Validates Zod schema and throws ChatSDKError on failure
 */
export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  surface: Surface,
  errorMessage = 'Invalid request body'
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ChatSDKError(`bad_request:${surface}`, errorMessage)
  }
  return result.data
}
