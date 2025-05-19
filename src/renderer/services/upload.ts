import { fetcher } from '@shared/utils/http'
import { Attachment } from 'ai'

export const customUpload = async (formData: FormData) =>
  fetcher<Attachment[]>('/api/custom-uploader', {
    method: 'POST',
    body: formData
  })
