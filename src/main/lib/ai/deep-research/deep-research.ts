import { WebSearchResult } from '@shared/types/web-search'
import { generateObject, LanguageModelV1 } from 'ai'
import pLimit from 'p-limit'
import { z } from 'zod'
import { DocumentData, ResearchProgress, ResearchResult } from './types'
import { webSearch } from './web-search'

async function generateSerpQueries({
  query,
  model,
  numQueries = 3,
  learnings
}: {
  query: string
  model: LanguageModelV1
  numQueries?: number
  learnings?: string[] // optional, if provided, the research will continue from the last learning
}) {
  const response = await generateObject({
    model,
    system: `
You are an expert researcher. Today is ${new Date().toISOString()}. Follow these instructions when responding:

- You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
- The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
- Be highly organized.
- Suggest solutions that I didn't think about.
- Be proactive and anticipate my needs.
- Treat me as an expert in all subject matter.
- Mistakes erode my trust, so be accurate and thorough.
- Provide detailed explanations, I'm comfortable with lots of detail.
- Value good arguments over authorities, the source is irrelevant.
- Consider new technologies and contrarian ideas, not just the conventional wisdom.
- You may use high levels of speculation or prediction, just flag it for me.
`,
    prompt: `Given the following prompt from the user, generate a list of SERP queries to research the topic. 
    Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. 
    Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
      learnings
        ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
            '\n'
          )}`
        : ''
    }`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The SERP query'),
            researchGoal: z.string().describe(
              `First talk about the goal of the research that this query is meant to accomplish, 
then go deeper into how to advance the research once the results are found, 
mention additional research directions. Be as specific as possible, especially for additional research directions.`
            )
          })
        )
        .describe(`List of SERP queries, max of ${numQueries}`)
    })
  })

  return response.object.queries.slice(0, numQueries)
}

async function processSerpResult({
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
  const responses: { learnings: string[]; followUpQuestions: string[] } = {
    learnings: [],
    followUpQuestions: []
  }

  for (let i = 0; i < searchResults.length; i++) {
    const response = await generateObject({
      model,
      system: `
You are an expert researcher. Today is ${new Date().toISOString()}. Follow these instructions when responding:

- You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
- The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
- Be highly organized.
- Suggest solutions that I didn't think about.
- Be proactive and anticipate my needs.
- Treat me as an expert in all subject matter.
- Mistakes erode my trust, so be accurate and thorough.
- Provide detailed explanations, I'm comfortable with lots of detail.
- Value good arguments over authorities, the source is irrelevant.
- Consider new technologies and contrarian ideas, not just the conventional wisdom.
- You may use high levels of speculation or prediction, just flag it for me.
`,
      prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, 
generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, 
but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. 
The learnings should be concise and to the point, as detailed and information dense as possible. 
Make sure to include any entities like people, places, companies, products, things, etc in the learnings, 
as well as any exact metrics, numbers, or dates. 
The learnings will be used to research the topic further.  <content>\n${searchResults[i].content}\n</content>
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

    // TODO: Perhaps this is not a good idea.
    // Adding the previous learnings to the next for-loop's prompt would make it more reasonable.
    responses.learnings = [...responses.learnings, ...response.object.learnings]
    responses.followUpQuestions = [
      ...responses.followUpQuestions,
      ...response.object.followUpQuestions
    ]
  }

  return responses
}

export async function deepResearch({
  serperApiKey,
  model,
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = new Map(),
  onProgress
}: {
  serperApiKey: string
  model: LanguageModelV1
  query: string
  breadth: number
  depth: number
  learnings?: string[]
  visitedUrls?: Map<string, DocumentData>
  onProgress?: (progress: ResearchProgress) => void
}): Promise<ResearchResult> {
  const progress: ResearchProgress = {
    currentDepth: depth,
    totalDepth: depth,
    currentBreadth: breadth,
    totalBreadth: breadth,
    totalQueries: 0,
    completedQueries: 0
  }

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update)
    onProgress?.(progress)
  }

  const serpQueries = await generateSerpQueries({
    query,
    model,
    learnings,
    numQueries: breadth
  })

  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query
  })

  const limit = pLimit(1)
  const researchResults = await Promise.all(
    serpQueries.map((serpQuery) =>
      limit(async () => {
        try {
          const searchResults = await webSearch({ serperApiKey, query })

          if (!searchResults) {
            throw new Error('Your search did not match any documents.')
          }

          const newBreadth = Math.ceil(breadth / 2)
          const newDepth = depth - 1

          const newLearnings = await processSerpResult({
            model,
            query: serpQuery.query,
            searchResults,
            numFollowUpQuestions: newBreadth
          })

          const allLearnings = [...learnings, ...newLearnings.learnings]

          if (newDepth > 0) {
            reportProgress({
              currentDepth: newDepth,
              currentBreadth: newBreadth,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query
            })

            const nextQuery = `
            Previous research goal: ${serpQuery.researchGoal}
            Follow-up research directions: ${newLearnings.followUpQuestions.map((q) => `\n${q}`).join('')}
          `.trim()

            return deepResearch({
              model,
              serperApiKey,
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls,
              onProgress
            })
          } else {
            reportProgress({
              currentDepth: 0,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query
            })
            return {
              learnings: allLearnings,
              visitedUrls
            }
          }
        } catch {
          return {
            learnings: [],
            visitedUrls: new Map()
          } as ResearchResult
        }
      })
    )
  )

  return {
    learnings: [
      ...new Set(
        researchResults.flatMap((researchResults) => researchResults.learnings)
      )
    ],
    visitedUrls
  }
}
