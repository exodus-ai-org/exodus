import { Attachment } from '@shared/types/chat'
import { fetcher } from '@shared/utils/http'

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
