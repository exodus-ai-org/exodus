import { Context } from 'hono'
import { ChatSDKError } from '../errors'

/**
 * Global error handler middleware for Hono
 */
export async function errorHandler(err: Error, c: Context) {
  // Handle ChatSDKError
  if (err instanceof ChatSDKError) {
    const response = err.toResponse()
    return c.json(await response.json(), response.status as never)
  }

  // Handle other errors
  console.error('Unhandled error:', err)
  return c.json(
    {
      code: 'bad_request:api',
      message: err.message || 'Internal Server Error'
    },
    500 as const
  )
}
