import { useSetAtom } from 'jotai'
import { useState } from 'react'
import { sileo } from 'sileo'

import { convertFileToBase64 } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'

export function useUpload() {
  const [loading, setLoading] = useState(false)
  const setAttachments = useSetAtom(attachmentAtom)

  const uploadFileToBase64 = async (files: File[]) => {
    const results = await Promise.all(
      files.map(async (file) => {
        const base64 = await convertFileToBase64(file)
        return { name: file.name, url: base64, contentType: file.type }
      })
    )
    setAttachments((prev) => [...(prev ?? []), ...results])
  }

  const uploadFile = async (files: File[], cleanup?: () => void) => {
    try {
      setLoading(true)
      await uploadFileToBase64(files)
    } catch {
      sileo.error({
        title: 'Upload failed',
        description: 'Failed to upload files.'
      })
    } finally {
      setLoading(false)
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }

  return { loading, uploadFile }
}
