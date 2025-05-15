import { WebSearchResult } from '@shared/types/web-search'
import { generateObject, LanguageModelV1 } from 'ai'
import { z } from 'zod'
import { Learning } from '../../../../shared/types/deep-research'
import { deepResearchSystemPrompt } from '../prompts'

export async function writeFinalReport(
  {
    prompt,
    learnings,
    visitedUrls
  }: {
    prompt: string
    learnings: Learning[]

    visitedUrls: Map<string, WebSearchResult>
  },
  {
    model
  }: {
    model: LanguageModelV1
  }
) {
  const learningsString = learnings
    .map(
      ({ learning, citations }) =>
        `<learning>\n[Source: ${citations.join(', ')}] ${learning}\n</learning>`
    )
    .join('\n')

  const response = await generateObject({
    model,
    system: deepResearchSystemPrompt,
    prompt:
      'Given the following prompt from the user, write a final report on the topic using the learnings from research. ' +
      "Every paragraph should include a citation in the format [Source: #], where # is the number of the search result you're referencing. for example: [Source: 2, 5]" +
      'Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research: ' +
      `\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    schema: z.object({
      report: z.string().describe('Final report on the topic in Markdown')
    })
  })

  return { report: response.object.report, visitedUrls }
}
