import { fetcher } from '@shared/utils/http'
import type { Settings } from 'src/shared/schemas/settings-schema'

export const updateSettings = async (payload: Settings) =>
  fetcher<void>('/api/settings', { method: 'POST', body: payload })
