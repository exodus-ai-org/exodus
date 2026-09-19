import type { Settings } from '@exodus/shared/schemas/settings-schema'
import { fetcher } from '@exodus/shared/utils/http'

export const updateSettings = async (payload: Settings) =>
  fetcher<void>('/api/v1/settings', { method: 'POST', body: payload })
