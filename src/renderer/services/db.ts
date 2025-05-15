import { fetcher } from '@shared/utils/http'

export const exportData = async () =>
  fetcher<Blob>('/api/db-io/export', { method: 'POST', responseType: 'blob' })
