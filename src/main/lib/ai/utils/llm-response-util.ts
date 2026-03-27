import { z } from 'zod'

/**
 * Extract text content from an LLM completion result.
 */
export function extractTextFromCompletion(
  content: Array<{ type: string; text?: string }>
): string {
  return content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('')
}

/**
 * Parse a JSON object from an LLM response using a Zod schema.
 * Falls back to the provided default if parsing fails.
 */
export function parseJsonFromLlmResponse<T>(
  text: string,
  schema: z.ZodType<T>,
  fallback: T
): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallback
    return schema.parse(JSON.parse(jsonMatch[0]))
  } catch {
    return fallback
  }
}
