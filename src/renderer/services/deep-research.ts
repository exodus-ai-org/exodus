import { DeepResearch, DeepResearchMessage } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'

export const fetchDeepResearchResult = async (id: string) => {
  return await fetcher<DeepResearch>(`/api/deep-research/result/${id}`, {
    method: 'GET'
  })
}

export const fetchDeepResearchMessages = async (id: string) => {
  return await fetcher<DeepResearchMessage[]>(
    `/api/deep-research/messages/${id}`,
    {
      method: 'GET'
    }
  )
}
