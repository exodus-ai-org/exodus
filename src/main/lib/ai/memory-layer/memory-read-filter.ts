import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import z from 'zod'

export const MemoryReadFilterSchema = z.object({
  selectedMemoryIds: z.array(z.string())
})

export async function filterRelevantMemories({
  question,
  memories,
  model,
  apiKey
}: {
  question: string
  memories: {
    id: string
    type: string
    content: string
  }[]
  model: Model<string>
  apiKey: string
}) {
  const prompt = `
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

Respond with JSON: {"selectedMemoryIds": []}
`

  const result = await completeSimple(
    model,
    {
      systemPrompt: `
You are selecting user memories.

Only select memories that are DIRECTLY useful
for answering the user's current question.
Do not guess. Do not over-select.
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
    if (!jsonMatch) return { text: '', object: { selectedMemoryIds: [] } }
    const parsed = MemoryReadFilterSchema.parse(JSON.parse(jsonMatch[0]))
    return { text, object: parsed }
  } catch {
    return { text, object: { selectedMemoryIds: [] } }
  }
}
