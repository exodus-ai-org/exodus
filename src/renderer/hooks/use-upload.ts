import { convertFileToBase64 } from '@/lib/utils'
import { customUpload } from '@/services/upload'
import { attachmentAtom } from '@/stores/chat'
import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSettings } from './use-settings'

export function useUpload() {
  const [loading, setLoading] = useState(false)
  const { data: settings } = useSettings()
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

    const data = await customUpload(formData)
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
