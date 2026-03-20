import { useUpload } from '@/hooks/use-upload'

import { PaperclipIcon } from 'lucide-react'
import { ChangeEvent, useRef } from 'react'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip'

export function MultiModelInputUploader() {
  const { uploadFile } = useUpload()
  const ref = useRef<HTMLInputElement>(null)

  const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    uploadFile([...files], () => {
      if (ref.current) {
        ref.current.value = ''
      }
    })
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant="ghost" className="relative size-6 rounded-full">
            <PaperclipIcon data-icon />
            <input
              ref={ref}
              type="file"
              accept="image/*"
              multiple
              className="absolute top-0 left-0 z-100 size-6 opacity-0"
              onChange={handleUploadFile}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upload files and more</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
