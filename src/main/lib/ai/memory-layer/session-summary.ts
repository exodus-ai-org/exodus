import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { ChatMessage } from '@shared/types/chat'
import z from 'zod'

import { extractConversationText } from '../utils/conversation-util'
import {
  extractTextFromCompletion,
  parseJsonFromLlmResponse
} from '../utils/llm-response-util'

export const SessionSummarySchema = z.object({
  userGoal: z.string().optional(),
  confirmedFacts: z.array(z.string()),
  openQuestions: z.array(z.string()),
  importantPreferences: z.array(z.string())
})

const FALLBACK = {
  confirmedFacts: [] as string[],
  openQuestions: [] as string[],
  importantPreferences: [] as string[]
}

export async function summarizeSession(
  messages: ChatMessage[],
  model: Model<string>,
  apiKey: string
) {
  const conversationText = extractConversationText(messages)

  const prompt =
    conversationText +
    `\n\nRespond with JSON: {"userGoal": optional string, "confirmedFacts": [], "openQuestions": [], "importantPreferences": []}`

  const result = await completeSimple(
    model,
    {
      systemPrompt: `
Summarize the conversation into structured session memory.
Be concise and factual.
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
  const parsed = parseJsonFromLlmResponse(text, SessionSummarySchema, FALLBACK)
  return { object: parsed }
}
