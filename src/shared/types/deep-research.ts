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
  EmitSearchQueries,
  EmitSearchResults,
  EmitLearnings,
  StartWritingFinalReport,
  CompleteDeepResearch
}

export interface StartDeepResearch {
  type: DeepResearchProgress.StartDeepResearch
}

export interface EmitSearchQueries {
  type: DeepResearchProgress.EmitSearchQueries
  query: string
  searchQueries: QueryWithResearchGoal[]
  deeper?: boolean
}

export interface EmitSearchResults {
  type: DeepResearchProgress.EmitSearchResults
  webSearchResults: WebSearchResult[]
  query: string
}

export interface EmitLearnings {
  type: DeepResearchProgress.EmitLearnings
  learnings: Learning[]
}

export interface StartWritingFinalReport {
  type: DeepResearchProgress.StartWritingFinalReport
}

export interface CompleteDeepResearch {
  type: DeepResearchProgress.CompleteDeepResearch
}

export type ReportProgressPayload =
  | StartDeepResearch
  | EmitSearchQueries
  | EmitSearchResults
  | EmitLearnings
  | StartWritingFinalReport
  | CompleteDeepResearch
