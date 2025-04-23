import { convertFileToBase64 } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import { BASE_URL } from '@shared/constants'
import { Attachment } from 'ai'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSetting } from './use-setting'

export function useUpload() {
  const [loading, setLoading] = useState(false)
  const { data: settings } = useSetting()
  const setAttachments = useSetAtom(attachmentAtom)

  const uploadFileToBase64 = async (files: File[]) => {
    const promises: Promise<string>[] = []
    for (const file of files) {
      promises.push(convertFileToBase64(file))
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const base64 = await convertFileToBase64(file)
        return { name: file.name, url: base64, contentType: file.type }
      })
    )
    setAttachments((prev) => [...(prev ?? []), ...results])
  }

  const uploadFileToEndpoint = async (files: File[]) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }

    const response = await fetch(`${BASE_URL}/api/custom-uploader`, {
      method: 'POST',
      body: formData
    })
    const data: Attachment[] = await response.json()
    setAttachments((prev) => [...(prev ?? []), ...data])
  }

  const uploadFile = async (files: File[], cleanup?: () => void) => {
    try {
      setLoading(true)
      if (settings?.fileUploadEndpoint) {
        uploadFileToEndpoint(files)
      } else {
        uploadFileToBase64(files)
      }
    } catch {
      toast.error('Failed to upload files.')
    } finally {
      setLoading(false)
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }

  return { loading, uploadFile }
}
