import type { Model, TextContent } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import type { ChatMessage } from '@shared/types/chat'

import { titleGenerationPrompt } from '../prompts'

// Re-exports for backwards compatibility
export {
  getApiKeyFromSetting,
  getModelFromProvider,
  PROVIDER_API_KEY_LABELS
} from './model-util'
export { bindCallingTools } from './tool-binding-util'

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

  const text = extractText(result.content)

  return text
    .replace(/^[#*"\s]+/, '')
    .replace(/["]+$/, '')
    .trim()
}
