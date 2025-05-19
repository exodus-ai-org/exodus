import { fetcher } from '@shared/utils/http'

export const markdownToPdf = async (markdown: string) =>
  fetcher<Blob>('/api/tools/md-to-pdf', {
    method: 'POST',
    body: { markdown },
    responseType: 'blob'
  })
