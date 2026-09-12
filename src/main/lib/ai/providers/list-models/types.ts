import type { ModelSnapshot } from '@shared/schemas/settings-schema'

export interface NormalizedModel {
  id: string
  displayName: string
  snapshot: ModelSnapshot
}

export interface ListModelsArgs {
  apiKey: string
  baseUrl?: string | null
  /** Azure only. */
  apiVersion?: string | null
}

export type ListModelsFn = (args: ListModelsArgs) => Promise<NormalizedModel[]>
