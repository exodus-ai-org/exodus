import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { ChatMessage } from '@shared/types/chat'
import z from 'zod'

export const SessionSummarySchema = z.object({
  userGoal: z.string().optional(),
  confirmedFacts: z.array(z.string()),
  openQuestions: z.array(z.string()),
  importantPreferences: z.array(z.string())
})

export async function summarizeSession(
  messages: ChatMessage[],
  model: Model<string>,
  apiKey: string
) {
  const conversationText = messages
    .map((m) => {
      let text = ''
      if (m.role === 'user') {
        if (typeof m.content === 'string') {
          text = m.content
        } else {
          text = m.content
            .filter((c) => c.type === 'text')
            .map((c) => (c as { type: 'text'; text: string }).text)
            .join('')
        }
      } else if (m.role === 'assistant') {
        text = m.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as { type: 'text'; text: string }).text)
          .join('')
      }
      return `${m.role}: ${text}`
    })
    .join('\n')

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

  const text = result.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('')

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        object: {
          confirmedFacts: [],
          openQuestions: [],
          importantPreferences: []
        }
      }
    }
    const parsed = SessionSummarySchema.parse(JSON.parse(jsonMatch[0]))
    return { object: parsed }
  } catch {
    return {
      object: {
        confirmedFacts: [],
        openQuestions: [],
        importantPreferences: []
      }
    }
  }
}
