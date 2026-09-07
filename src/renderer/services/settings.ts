import type { Settings } from '@shared/schemas/settings-schema'
import { fetcher } from '@shared/utils/http'

export const updateSettings = async (payload: Settings) =>
  fetcher<void>('/api/settings', { method: 'POST', body: payload })
