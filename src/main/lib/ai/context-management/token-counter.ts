/**
 * Token counting utilities.
 * Uses a character-based approximation (~3.5 chars/token) which is accurate
 * enough for LCM threshold triggers.
 */

const CHARS_PER_TOKEN = 3.5

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function estimateJsonTokens(value: unknown): number {
  return estimateTokens(JSON.stringify(value) ?? '')
}

// Overhead per message for role, structure, etc.
const MESSAGE_OVERHEAD = 8

export function estimateMessageTokens(content: unknown): number {
  return estimateJsonTokens(content) + MESSAGE_OVERHEAD
}
