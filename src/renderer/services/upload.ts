import { Attachment } from '@exodus/shared/types/chat'
import { fetcher } from '@exodus/shared/utils/http'

export const customUpload = async (formData: FormData) =>
  fetcher<Attachment[]>('/api/custom-uploader', {
    method: 'POST',
    body: formData
  })
