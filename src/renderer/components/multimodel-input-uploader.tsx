import { convertFileToBase64 } from '@/lib/utils'
import { attachmentAtom } from '@/stores/chat'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { useSetAtom } from 'jotai'
import { Plus } from 'lucide-react'
import { ChangeEvent, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function MultiModelInputUploader() {
  const setAttachments = useSetAtom(attachmentAtom)
  const ref = useRef<HTMLInputElement>(null)

  const uploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const promises: Promise<string>[] = []
    for (const file of files) {
      promises.push(convertFileToBase64(file))
    }

    try {
      const results = await Promise.all(
        [...files].map(async (file) => {
          const base64 = await convertFileToBase64(file)
          return { name: file.name, url: base64, contentType: file.type }
        })
      )
      setAttachments(results)
    } catch {
      toast.error('Failed to upload files.')
    } finally {
      if (ref.current) {
        ref.current.value = ''
      }
    }
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full border"
          >
            <Plus />
            <input
              ref={ref}
              type="file"
              accept="image/*"
              multiple
              className="absolute top-0 left-0 z-100 h-9 w-9 opacity-0"
              onChange={uploadFile}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upload files and more</p>
          <TooltipArrow className="TooltipArrow" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
