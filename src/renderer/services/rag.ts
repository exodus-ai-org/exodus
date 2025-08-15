import { fetcher } from '@shared/utils/http'
import { Attachment } from 'ai'

export const embedding = async (formData: FormData) =>
  fetcher<Attachment[]>('/api/rag', {
    method: 'POST',
    body: formData
  })

// export const retrieve = async (formData: FormData) =>
//   fetcher<Attachment[]>('/api/rag', {
//     method: 'POST',
//     body: formData
//   })
