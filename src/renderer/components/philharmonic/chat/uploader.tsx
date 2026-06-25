// src/renderer/components/philharmonic/chat/uploader.tsx
import { Loader2Icon, PaperclipIcon } from 'lucide-react'
import { type ChangeEvent, useRef } from 'react'

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
    <button
      type="button"
      aria-label="Attach images"
      disabled={uploading}
      className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--ph-radius-md)] text-[var(--ph-text-muted)] transition-colors hover:bg-[var(--ph-canvas)] hover:text-[var(--ph-text)] disabled:opacity-60"
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
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-hidden="true"
      />
    </button>
  )
}
