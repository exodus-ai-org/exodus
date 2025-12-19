import { fetcher } from '@shared/utils/http'
import type { Setting } from 'src/shared/schemas/setting-schema'

export const updateSetting = async (payload: Setting) =>
  fetcher<void>('/api/setting', { method: 'POST', body: payload })
