import type { LanguageModelV2 } from '@ai-sdk/provider'
import {
  DeepResearchProgress,
  Learning,
  QueryWithResearchGoal,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { WebSearchResult } from '@shared/types/web-search'
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
    model: LanguageModelV2
    serperApiKey: string
    notify: (payload: ReportProgressPayload) => Promise<void>
  }
) {
  const learnings: Learning[] = []
  const webSources: Map<string, WebSearchResult> = new Map()
  const serpQueries = await generateSerpQueries({ query }, { model })

  await notify({
    type: DeepResearchProgress.EmitSearchQueries,
    query,
    searchQueries: serpQueries
  })

  for (const serpQuery of serpQueries) {
    await recursiveDeepResearch(
      {
        serpQuery,
        breadth,
        depth,
        learnings,
        webSources
      },
      {
        notify,
        serperApiKey,
        model
      }
    )
  }

  return { learnings, webSources }
}

async function recursiveDeepResearch(
  {
    serpQuery,
    breadth,
    depth,
    learnings = [],
    webSources = new Map()
  }: {
    serpQuery: QueryWithResearchGoal
    breadth: number
    depth: number
    learnings?: Learning[]
    webSources?: Map<string, WebSearchResult>
  },
  {
    serperApiKey,
    model,
    notify
  }: {
    notify: (payload: ReportProgressPayload) => Promise<void>
    serperApiKey: string
    model: LanguageModelV2
  }
) {
  if (depth <= 0 || breadth <= 0) return

  const searchResults = await webSearch(
    {
      query: serpQuery.query,
      webSources
    },
    { serperApiKey }
  )
  if (!searchResults) return

  await notify({
    type: DeepResearchProgress.EmitSearchResults,
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
    webSources.set(searchResult.link, { ...searchResult })
  )

  const subQuery = [
    `Previous research goal: ${serpQuery.researchGoal}`,
    `Follow-up research directions:`,
    ...newLearningsResult.followUpQuestions.map((q) => `- ${q}`)
  ].join('\n')

  const subSerpQueries = await generateSerpQueries(
    {
      query: subQuery,
      learnings,
      numQueries: newBreadth
    },
    { model }
  )

  await notify({
    type: DeepResearchProgress.EmitSearchQueries,
    query: subQuery,
    searchQueries: subSerpQueries,
    deeper: true
  })

  for (const subSerpQuery of subSerpQueries) {
    await recursiveDeepResearch(
      {
        serpQuery: subSerpQuery,
        breadth: newBreadth,
        depth: newDepth,
        learnings,
        webSources
      },
      {
        notify,
        serperApiKey,
        model
      }
    )
  }
}
