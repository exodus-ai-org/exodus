import { openai } from '@ai-sdk/openai'
import { generateObject, UIMessage } from 'ai'
import { z } from 'zod'

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
  value: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['explicit', 'implicit']).optional()
})

export async function runMemoryWriteJudge({
  messages
}: {
  messages: UIMessage[]
}) {
  return generateObject({
    model: openai('gpt-4.1-mini'),
    schema: MemoryWriteSchema,
    system: `
You are a memory writing judge for an AI assistant.

Only allow writing a memory if ALL conditions are met:
1. The information is long-term stable (weeks or longer)
2. Useful across multiple conversations
3. Not sensitive personal data
4. Explicitly stated or strongly implied by the user

If any condition is not met, set shouldWrite = false.
`,
    prompt: `
Conversation:
${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}
`
  })
}
