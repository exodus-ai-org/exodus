import { convertFileToBase64 } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import { useSetAtom } from 'jotai'
import { toast } from 'sonner'

export function useUpload() {
  const setAttachments = useSetAtom(attachmentAtom)

  const uploadFile = async (files: File[], cleanup?: () => void) => {
    const promises: Promise<string>[] = []
    for (const file of files) {
      promises.push(convertFileToBase64(file))
    }

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const base64 = await convertFileToBase64(file)
          return { name: file.name, url: base64, contentType: file.type }
        })
      )
      setAttachments((prev) => [...(prev ?? []), ...results])
    } catch {
      toast.error('Failed to upload files.')
    } finally {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }

  return { uploadFile }
}
