import { LanguageModelV1 } from 'ai'
import { generateSerpQueries } from './generate-queries'
import { processSerpResult } from './process-search-results'
import { DocumentData, ResearchProgress, ResearchResult } from './types'
import { webSearch } from './web-search'

export async function deepResearch({
  serperApiKey,
  deepResearchId,
  model,
  query,
  breadth,
  depth,
  learnings: initialLearnings = [],
  visitedUrls: initialVisitedUrls = new Map(),
  onProgress
}: {
  serperApiKey: string
  deepResearchId: string
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
    learnings: initialLearnings,
    numQueries: breadth
  })

  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query
  })

  let allLearnings: string[] = [...initialLearnings]
  const allVisitedUrls: Map<string, DocumentData> = new Map(initialVisitedUrls)

  for (const serpQuery of serpQueries) {
    try {
      const searchResults = await webSearch({
        serperApiKey,
        query: serpQuery.query
      })

      if (!searchResults) {
        continue
      }

      const newBreadth = Math.ceil(breadth / 2)
      const newDepth = depth - 1
      const newLearningsResult = await processSerpResult({
        model,
        query: serpQuery.query,
        searchResults,
        numFollowUpQuestions: newBreadth
      })
      const currentLearnings = [
        ...allLearnings,
        ...newLearningsResult.learnings
      ]

      if (newDepth > 0) {
        reportProgress({
          currentDepth: newDepth,
          currentBreadth: newBreadth,
          completedQueries: progress.completedQueries + 1,
          currentQuery: serpQuery.query
        })

        const nextQuery = `
          Previous research goal: ${serpQuery.researchGoal}
          Follow-up research directions: ${newLearningsResult.followUpQuestions.map((q) => `\n${q}`).join('')}
        `.trim()

        const recursiveResult = await deepResearch({
          model,
          deepResearchId,
          serperApiKey,
          query: nextQuery,
          breadth: newBreadth,
          depth: newDepth,
          learnings: currentLearnings,
          visitedUrls: allVisitedUrls,
          onProgress
        })
        allLearnings = [
          ...new Set([...allLearnings, ...recursiveResult.learnings])
        ]
        for (const [url, data] of recursiveResult.visitedUrls) {
          allVisitedUrls.set(url, data)
        }
      } else {
        reportProgress({
          currentDepth: 0,
          completedQueries: progress.completedQueries + 1,
          currentQuery: serpQuery.query
        })
        allLearnings = [...new Set([...allLearnings, ...currentLearnings])]
        // Process visitedUrls from the current level if needed
        // For example, if processSerpResult returns visited URLs:
        // for (const [url, data] of newLearningsResult.visitedUrls || []) {
        //   allVisitedUrls.set(url, data);
        // }
      }
    } catch (error) {
      console.error('Error during deep research:', error)
    }
  }

  return {
    learnings: allLearnings,
    visitedUrls: allVisitedUrls
  }
}
