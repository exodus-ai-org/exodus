import { WebSearchResult } from '@shared/types/web-search'
import { LanguageModelV1, generateObject } from 'ai'
import { z } from 'zod'
import { deepResearchSystemPrompt } from '../prompts'

export async function processSerpResult({
  query,
  model,
  searchResults,
  numLearnings = 3,
  numFollowUpQuestions = 3
}: {
  query: string
  model: LanguageModelV1
  searchResults: WebSearchResult[]
  numLearnings?: number
  numFollowUpQuestions?: number
}) {
  const response = await generateObject({
    model,
    system: deepResearchSystemPrompt,
    prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, 
generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, 
but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. 
The learnings should be concise and to the point, as detailed and information dense as possible. 
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, 
as well as any exact metrics, numbers, or dates. 
The learnings will be used to research the topic further. \n ${searchResults.map(({ content }) => `<content>\n${content}\n</content>`).join('\n')}
`,
    schema: z.object({
      learnings: z
        .array(z.string())
        .describe(`List of learnings, max of ${numLearnings}`),
      followUpQuestions: z
        .array(z.string())
        .describe(
          `List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`
        )
    })
  })

  const responses: { learnings: string[]; followUpQuestions: string[] } = {
    learnings: response.object.learnings,
    followUpQuestions: response.object.followUpQuestions
  }

  return responses
}
