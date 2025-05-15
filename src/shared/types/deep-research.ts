import { WebSearchResult } from './web-search'

export interface ResearchResult {
  learnings: Learning[]
  visitedUrls: Map<string, WebSearchResult>
}

export interface Learning {
  learning: string
  citations: number[]
}

export interface QueryWithResearchGoal {
  query: string
  researchGoal: string
}

export enum DeepResearchProgress {
  StartDeepResearch,
  EmitSearchObjectives,
  RequestWebSearch,
  RequestLearnings,
  EmitLearnings,
  RequestWriteFinalReport,
  CompleteDeepResearch
}

export interface ReportProgressPayload {
  type: DeepResearchProgress
  webSearchResults?: WebSearchResult[]
  learnings?: Learning[]
  searchObjectives?: QueryWithResearchGoal[]
  query?: string
  finalReport?: string
  deeper?: boolean
}
