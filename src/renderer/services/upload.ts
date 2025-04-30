import { Attachment } from 'ai'
import { fetcher } from './http'

export const customUpload = async (formData: FormData) =>
  fetcher<Attachment[]>('/api/custom-uploader', {
    method: 'POST',
    body: formData
  })
