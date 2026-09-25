import { WebSearchResult } from './web-search'

export interface ResearchResult {
  learnings: Learning[]
  webSources: Map<string, WebSearchResult>
}

export interface Learning {
  learning: string
  citations: number[]
  image: string | null
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
  CompleteDeepResearch,
  // Appended, never inserted — these numeric values are persisted verbatim
  // in `deep_research_message.message` and read back by older rows.
  FailDeepResearch
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
  query: string
}

/** The job threw or was aborted; `error` is a short, secret-scrubbed summary. */
export interface FailDeepResearch {
  type: DeepResearchProgress.FailDeepResearch
  error: string
}

export type ReportProgressPayload =
  | StartDeepResearch
  | EmitSearchQueries
  | EmitSearchResults
  | EmitLearnings
  | StartWritingFinalReport
  | CompleteDeepResearch
  | FailDeepResearch
