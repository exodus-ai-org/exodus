import { useUpload } from '@/hooks/use-upload'
import { TooltipArrow } from '@radix-ui/react-tooltip'
import { Plus } from 'lucide-react'
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
              onChange={handleUploadFile}
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
