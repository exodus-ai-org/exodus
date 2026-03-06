import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import z from 'zod'

export const MemoryReadFilterSchema = z.object({
  selectedMemoryIds: z.array(z.string())
})

export async function filterRelevantMemories({
  question,
  memories
}: {
  question: string
  memories: {
    id: string
    type: string
    content: string
  }[]
}) {
  return generateText({
    model: openai('gpt-4.1-mini'),
    system: `
You are selecting user memories.

Only select memories that are DIRECTLY useful
for answering the user's current question.
Do not guess. Do not over-select.
`,

    prompt: `
User Question:
${question}

Memories:
${memories
  .map(
    (m) => `
id: ${m.id}
type: ${m.type}
content: ${m.content}
`
  )
  .join('\n')}
`,
    output: Output.object({
      schema: MemoryReadFilterSchema
    })
  })
}
