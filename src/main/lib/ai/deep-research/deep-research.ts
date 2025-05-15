import {
  DeepResearchProgress,
  Learning,
  QueryWithResearchGoal,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { WebSearchResult } from '@shared/types/web-search'
import { LanguageModelV1 } from 'ai'
import { generateSerpQueries } from './generate-queries'
import { processSerpResult } from './process-search-results'
import { webSearch } from './web-search'

export async function deepResearch(
  { query, breadth, depth }: { query: string; breadth: number; depth: number },
  {
    model,
    serperApiKey,
    notify
  }: {
    model: LanguageModelV1
    serperApiKey: string
    notify: (payload: ReportProgressPayload) => Promise<void>
  }
) {
  const learnings: Learning[] = []
  const visitedUrls: Map<string, WebSearchResult> = new Map()
  const serpQueries = await generateSerpQueries({ query }, { model })

  await notify({
    type: DeepResearchProgress.EmitSearchObjectives,
    searchObjectives: serpQueries
  })

  for (const serpQuery of serpQueries) {
    await recursiveDeepResearch(
      {
        serpQuery,
        breadth,
        depth,
        learnings,
        visitedUrls
      },
      {
        notify,
        serperApiKey,
        model
      }
    )
  }

  return { learnings, visitedUrls }
}

async function recursiveDeepResearch(
  {
    serpQuery,
    breadth,
    depth,
    learnings = [],
    visitedUrls = new Map()
  }: {
    serpQuery: QueryWithResearchGoal
    breadth: number
    depth: number
    learnings?: Learning[]
    visitedUrls?: Map<string, WebSearchResult>
  },
  {
    serperApiKey,
    model,
    notify
  }: {
    notify: (payload: ReportProgressPayload) => Promise<void>
    serperApiKey: string
    model: LanguageModelV1
  }
) {
  if (depth <= 0 || breadth <= 0) return

  await notify({
    type: DeepResearchProgress.RequestWebSearch,
    query: serpQuery.query
  })

  const searchResults = await webSearch(
    {
      query: serpQuery.query,
      visitedUrls
    },
    { serperApiKey }
  )
  if (!searchResults) return

  await notify({
    type: DeepResearchProgress.RequestLearnings,
    webSearchResults: searchResults,
    query: serpQuery.query
  })

  const newBreadth = Math.ceil(breadth / 2)
  const newDepth = depth - 1

  const newLearningsResult = await processSerpResult(
    {
      query: serpQuery.query,
      searchResults,
      numFollowUpQuestions: newBreadth
    },
    { model }
  )

  await notify({
    type: DeepResearchProgress.EmitLearnings,
    learnings: newLearningsResult.learnings
  })

  learnings.push(...newLearningsResult.learnings)
  searchResults.forEach((searchResult) =>
    visitedUrls.set(searchResult.link, { ...searchResult })
  )

  const subObject = [
    `Previous research goal: ${serpQuery.researchGoal}`,
    `Follow-up research directions:`,
    ...newLearningsResult.followUpQuestions.map((q) => `- ${q}`)
  ].join('\n')

  const subSerpQueries = await generateSerpQueries(
    {
      query: subObject,
      learnings,
      numQueries: newBreadth
    },
    { model }
  )

  // TODO: ADD query
  await notify({
    type: DeepResearchProgress.EmitSearchObjectives,
    searchObjectives: subSerpQueries,
    deeper: true
  })

  for (const subSerpQuery of subSerpQueries) {
    await notify({
      type: DeepResearchProgress.RequestWebSearch,
      query: subSerpQuery.query,
      deeper: true
    })
    await recursiveDeepResearch(
      {
        serpQuery: subSerpQuery,
        breadth: newBreadth,
        depth: newDepth,
        learnings,
        visitedUrls
      },
      {
        notify,
        serperApiKey,
        model
      }
    )
  }
}
