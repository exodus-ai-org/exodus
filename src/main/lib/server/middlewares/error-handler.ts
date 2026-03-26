import { Context } from 'hono'

import { logger } from '../../logger'
import { ChatSDKError } from '../errors'

/**
 * Global error handler middleware for Hono.
 * Converts all errors into structured JSON responses with user-friendly messages.
 */
export async function errorHandler(err: Error, c: Context) {
  // ChatSDKError already has structured code, message, and visibility
  if (err instanceof ChatSDKError) {
    const response = err.toResponse()
    return c.json(await response.json(), response.status as never)
  }

  // For unknown errors, log full details but return a friendly message
  logger.error('server', 'Unhandled error', {
    error: String(err),
    stack: err?.stack
  })

  // Try to extract a meaningful message from the error
  const rawMessage = err?.message || ''
  const friendlyMessage = toFriendlyErrorMessage(rawMessage)

  return c.json(
    {
      code: 'bad_request:api',
      message: friendlyMessage
    },
    500 as const
  )
}

/**
 * Convert raw error messages into user-friendly text.
 * Matches common patterns from providers, network, and internal errors.
 */
function toFriendlyErrorMessage(raw: string): string {
  const lower = raw.toLowerCase()

  // Provider / API key not configured
  if (
    lower.includes('failed to retrieve selected provider') ||
    lower.includes('no ai provider')
  ) {
    return 'No AI provider selected. Please choose a provider in Settings → AI Providers.'
  }

  if (
    lower.includes('not configured') ||
    lower.includes('api key') ||
    lower.includes('apikey')
  ) {
    return raw // Already descriptive from getModelFromProvider
  }

  // Settings missing
  if (
    lower.includes('failed to retrieve setting') ||
    lower.includes('settings not initialized')
  ) {
    return 'Settings not initialized. Please restart the app.'
  }

  // Network errors
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('socket hang up')
  ) {
    return 'Unable to connect to the AI provider. Please check your network connection and API base URL.'
  }

  // Provider server errors
  if (lower.includes('500') || lower.includes('internal server error')) {
    return 'The AI provider returned a server error. Please try again later.'
  }
  if (
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('overloaded')
  ) {
    return 'The AI provider is temporarily unavailable. Please try again in a few moments.'
  }

  // Auth errors
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Invalid API key. Please check your API key in Settings → AI Providers.'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Access denied. Your API key may lack the required permissions.'
  }

  // Rate limiting
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'Rate limit exceeded. Please wait a moment and try again.'
  }

  // Fallback — don't expose raw internal errors
  return 'Something went wrong. Please try again later.'
}
