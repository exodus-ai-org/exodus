import { Learning } from '@shared/types/deep-research'
import { LanguageModelV1, generateObject } from 'ai'
import { z } from 'zod'
import { deepResearchSystemPrompt } from '../prompts'

export async function generateSerpQueries(
  {
    query,
    numQueries = 3,
    learnings
  }: {
    query: string
    numQueries?: number
    learnings?: Learning[]
  },
  { model }: { model: LanguageModelV1 }
) {
  const response = await generateObject({
    model,
    system: deepResearchSystemPrompt,
    prompt:
      'Given the following prompt from the user, generate a list of SERP queries to research the topic.' +
      `Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. ` +
      `Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n` +
      `${
        learnings
          ? `Here are some learnings from previous research, use them to generate more specific queries:\n ${learnings
              .map((learning) => `<learning>\n${learning}\n</learning>`)
              .join('\n')}`
          : ''
      }`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The SERP query'),
            researchGoal: z
              .string()
              .describe(
                'First talk about the goal of the research that this query is meant to accomplish, ' +
                  'then go deeper into how to advance the research once the results are found, ' +
                  'mention additional research directions. Be as specific as possible, especially for additional research directions. '
              )
          })
        )
        .describe(`List of SERP queries, max of ${numQueries}`)
    })
  })

  return response.object.queries
}
