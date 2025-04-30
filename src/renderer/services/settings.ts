import { Settings } from '@shared/types/db'
import { fetcher } from './http'

export const updateSetting = async (payload: Settings) =>
  fetcher<void>('/api/settings', { method: 'POST', body: payload })
