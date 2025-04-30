import { fetcher } from './http'

export const exportData = async () =>
  fetcher<Blob>('/api/db-io/export', { method: 'POST', responseType: 'blob' })
