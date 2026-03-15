import type { Model } from '@mariozechner/pi-ai'
import { completeSimple } from '@mariozechner/pi-ai'
import { Learning } from '@shared/types/deep-research'
import { deepResearchSystemPrompt } from '../prompts'

export async function writeFinalReport(
  {
    prompt,
    learnings
  }: {
    prompt: string
    learnings: Learning[]
  },
  {
    model,
    apiKey
  }: {
    model: Model<string>
    apiKey: string
  }
) {
  const learningsString = learnings
    .map(
      ({ learning, citations }) =>
        `<learning>\n[Source: ${citations.join(', ')}] ${learning}\n</learning>`
    )
    .join('\n')

  const userPrompt =
    'Given the following prompt from the user, write a final report on the topic using the learnings from research. ' +
    "Every paragraph should include a citation in the format [Source: #], where # is the number of the search result you're referencing. for example: [Source: 2, 5] " +
    'The learnings from your research may include images. Remember to insert them in appropriate places in your final report. ' +
    'Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research: ' +
    `\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>` +
    `\n\nRespond with a JSON object: {"report": "<markdown report text>"}`

  const result = await completeSimple(
    model,
    {
      systemPrompt: deepResearchSystemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
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
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0]) as { report: string }
    return parsed.report
  } catch {
    // Return raw text if JSON parsing fails
    return text
  }
}
