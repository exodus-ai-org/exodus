import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { ChatMessage } from '@shared/types/chat'
import { z } from 'zod'

import { extractConversationText } from '../utils/conversation-util'
import {
  extractTextFromCompletion,
  parseJsonFromLlmResponse
} from '../utils/llm-response-util'

export const MemoryWriteSchema = z.object({
  shouldWrite: z.boolean(),
  type: z
    .enum([
      'preference',
      'goal',
      'environment',
      'skill',
      'project',
      'constraint'
    ])
    .optional(),
  key: z.string().optional(),
  value: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['explicit', 'implicit']).optional()
})

export async function runMemoryWriteJudge({
  messages,
  model,
  apiKey
}: {
  messages: ChatMessage[]
  model: Model<string>
  apiKey: string
}) {
  const conversationText = extractConversationText(messages)

  const prompt = `
Conversation:
${conversationText}

Respond with a JSON object: {"shouldWrite": boolean, "type": optional string, "key": optional string, "value": optional object, "confidence": optional number, "source": optional string}
`

  const result = await completeSimple(
    model,
    {
      systemPrompt: `
You are a memory writing judge for an AI assistant.

Only allow writing a memory if ALL conditions are met:
1. The information is long-term stable (weeks or longer)
2. Useful across multiple conversations
3. Not sensitive personal data
4. Explicitly stated or strongly implied by the user

If any condition is not met, set shouldWrite = false.
`,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
          timestamp: Date.now()
        }
      ]
    },
    { apiKey }
  )

  const text = extractTextFromCompletion(result.content)
  const parsed = parseJsonFromLlmResponse(text, MemoryWriteSchema, {
    shouldWrite: false
  })
  return { object: parsed }
}
