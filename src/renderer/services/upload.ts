import { Attachment } from '@shared/types/chat'
import { fetcher } from '@shared/utils/http'

export const customUpload = async (formData: FormData) =>
  fetcher<Attachment[]>('/api/custom-uploader', {
    method: 'POST',
    body: formData
  })
