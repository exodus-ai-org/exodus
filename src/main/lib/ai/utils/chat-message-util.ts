import type { Model, TextContent } from '@earendil-works/pi-ai'
import type { ChatMessage } from '@exodus/shared/types/chat'

import { titleGenerationPrompt } from '../prompts'
import { completeSimple } from './complete'

// Re-exports for backwards compatibility
export {
  getApiKeyFromSetting,
  getModelFromProvider,
  PROVIDER_API_KEY_LABELS
} from './model-util'
export { bindCallingTools } from './tool-binding-util'

const TITLE_FALLBACK_CHARS = 60

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((c): c is TextContent => c.type === 'text')
    .map((c) => c.text)
    .join('')
}

export function getTextFromMessage(message: ChatMessage): string {
  if (message.role === 'user') {
    if (typeof message.content === 'string') return message.content
    return extractText(message.content)
  }
  return extractText(message.content)
}

export async function generateTitleFromUserMessage({
  message,
  model,
  apiKey
}: {
  message: ChatMessage
  model: Model<string>
  apiKey: string
}) {
  const userText = getTextFromMessage(message)
  // Never rejects: the chat route awaits this inside the turn's `try`, where a
  // throw would report an error for a turn that in fact succeeded. A failed
  // (or empty) title request falls back to the opening of the message — a
  // blank title is what the sidebar used to get.
  const fallback = userText
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITLE_FALLBACK_CHARS)
  try {
    const result = await completeSimple(
      model,
      {
        systemPrompt: titleGenerationPrompt,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: userText }],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey }
    )

    const title = extractText(result.content)
      .replace(/^[#*"\s]+/, '')
      .replace(/["]+$/, '')
      .trim()
    return title || fallback
  } catch {
    return fallback
  }
}
