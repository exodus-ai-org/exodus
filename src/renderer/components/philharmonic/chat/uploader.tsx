// src/renderer/components/philharmonic/chat/uploader.tsx
import { Loader2Icon, PaperclipIcon } from 'lucide-react'
import { type ChangeEvent, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { usePhilharmonicUpload } from '@/hooks/use-philharmonic-upload'

export function ComposerUploader() {
  const { upload, uploading } = usePhilharmonicUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await upload([...files])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Attach images"
      disabled={uploading}
      className="text-muted-foreground hover:bg-background hover:text-foreground relative shrink-0 rounded-lg"
    >
      {uploading ? (
        <Loader2Icon className="h-4 w-4 animate-spin" />
      ) : (
        <PaperclipIcon className="h-4 w-4" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        disabled={uploading}
        tabIndex={-1}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-hidden="true"
      />
    </Button>
  )
}
