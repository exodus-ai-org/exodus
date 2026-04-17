/**
 * Extract error message from a tool_execution_end result.
 * The result can be:
 * - AgentToolResult: { content: [{ type: 'text', text: '...' }], details: {} }
 * - Error instance: { message: '...' }
 * - Plain string
 * - Unknown object with .message
 */
export function extractToolErrorMessage(result: unknown): string {
  if (typeof result === 'string') return result
  if (result instanceof Error) return result.message

  if (result && typeof result === 'object') {
    // AgentToolResult shape: extract text from content array
    const r = result as {
      content?: Array<{ type: string; text?: string }>
      message?: string
    }
    if (Array.isArray(r.content)) {
      const text = r.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text)
        .join('')
      if (text) return text
    }
    // Duck-typed Error or plain object with message
    if (typeof r.message === 'string' && r.message) return r.message
  }

  return 'Tool execution failed'
}

import { isOverflowError, OVERFLOW_MESSAGE } from '../../ai/utils/overflow'

/**
 * Translate raw LLM SDK / network errors into user-friendly messages.
 * Keeps the original message as a fallback if no pattern matches.
 */
export function toFriendlyChatError(raw: string): string {
  const lower = raw.toLowerCase()

  // Context overflow (checked first via comprehensive regex set)
  if (isOverflowError(raw)) {
    return OVERFLOW_MESSAGE
  }

  // API key issues (most providers return 401 or mention "api key")
  if (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid x-api-key') ||
    lower.includes('incorrect api key') ||
    lower.includes('authentication')
  ) {
    return 'Invalid API key. Please check your API key in Settings → Providers.'
  }

  // Forbidden / permission errors
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Access denied. Your API key may lack the required permissions, or the selected model is not available on your plan.'
  }

  // Rate limit
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('quota')
  ) {
    return 'Rate limit exceeded. Please wait a moment and try again, or check your API usage quota.'
  }

  // Model not found
  if (
    (lower.includes('404') && lower.includes('model')) ||
    lower.includes('model not found') ||
    lower.includes('does not exist')
  ) {
    return 'The selected model was not found. Please check the model name in Settings → Providers.'
  }

  // Network / connection errors
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('socket hang up')
  ) {
    return 'Unable to connect to the AI provider. Please check your network connection and API base URL.'
  }

  // Server errors from provider
  if (lower.includes('500') || lower.includes('internal server error')) {
    return 'The AI provider returned a server error. Please try again later.'
  }
  if (
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable')
  ) {
    return 'The AI provider is temporarily unavailable. Please try again in a few moments.'
  }

  // Fallback: return the original message
  return raw
}
