import { generateObject, LanguageModelV1 } from 'ai'
import { z } from 'zod'
import { deepResearchSystemPrompt } from '../prompts'
import { DocumentData } from './types'

export async function writeFinalReport({
  prompt,
  deepResearchId,
  learnings,
  model,
  visitedUrls
}: {
  prompt: string
  deepResearchId: string
  learnings: string[]
  model: LanguageModelV1
  visitedUrls: Map<string, DocumentData>
}) {
  console.log(deepResearchId)
  const learningsString = learnings
    .map((learning) => `<learning>\n${learning}\n</learning>`)
    .join('\n')

  const response = await generateObject({
    model,
    system: deepResearchSystemPrompt,
    prompt:
      'Given the following prompt from the user, write a final report on the topic using the learnings from research. ' +
      `Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    schema: z.object({
      reportMarkdown: z
        .string()
        .describe('Final report on the topic in Markdown')
    })
  })

  const urlsSection = `\n\n## Sources\n\n${[...visitedUrls.keys()].map((url) => `- ${url}`).join('\n')}`
  return response.object.reportMarkdown + urlsSection
}
