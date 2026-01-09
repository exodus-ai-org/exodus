import { openai } from '@ai-sdk/openai'
import { UIMessage, generateObject } from 'ai'
import z from 'zod'

export const SessionSummarySchema = z.object({
  userGoal: z.string().optional(),
  confirmedFacts: z.array(z.string()),
  openQuestions: z.array(z.string()),
  importantPreferences: z.array(z.string())
})

export async function summarizeSession(messages: UIMessage[]) {
  return generateObject({
    model: openai('gpt-4.1-mini'),
    schema: SessionSummarySchema,
    system: `
Summarize the conversation into structured session memory.
Be concise and factual.
`,
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join('\n')
  })
}
