import type { Usage } from '@mariozechner/pi-ai'

/**
 * Regex patterns that match context-window overflow errors from major providers.
 * Each pattern is tested against the lowercased error message.
 */
const OVERFLOW_PATTERNS = [
  // OpenAI
  /maximum context length/,
  /this model's maximum context/,
  /request too large/,
  /reduce the length of the messages/,
  /max_tokens.*exceeded/,
  /context_length_exceeded/,
  // Anthropic
  /prompt is too long/,
  /request too large for model/,
  /exceeds the maximum number of tokens/,
  /exceeds.*context.*window/,
  // Google
  /exceeds the maximum number of input tokens/,
  /request payload size exceeds/,
  /content too large/,
  // Azure
  /tokens_limit_reached/,
  /maximum number of tokens/,
  // Generic
  /context.*too.*long/,
  /token.*limit/i,
  /input.*too.*large/
]

/**
 * Check if an error message indicates a context window overflow.
 */
export function isOverflowError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return OVERFLOW_PATTERNS.some((p) => p.test(lower))
}

/**
 * Detect silent overflow: the model returned "stop" but usage indicates
 * it consumed more input than the context window allows.
 * This catches cases where providers silently truncate instead of erroring.
 */
export function isSilentOverflow(
  usage: Usage | undefined,
  contextWindow: number,
  stopReason: string | undefined
): boolean {
  if (!usage || !stopReason || stopReason !== 'stop') return false
  const inputTotal = (usage.input ?? 0) + (usage.cacheRead ?? 0)
  return inputTotal > contextWindow * 0.95
}

/**
 * User-friendly overflow message.
 */
export const OVERFLOW_MESSAGE =
  'The conversation is too long for the selected model. Try starting a new chat or switching to a model with a larger context window.'
