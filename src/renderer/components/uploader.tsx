import { cn } from '@/lib/utils'
import { Loader, UploadCloud } from 'lucide-react'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export function Uploader({
  loading,
  accept,
  max,
  onChange
}: {
  loading: boolean
  max?: number
  accept?: string
  onChange: (files: File[]) => void
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onChange(acceptedFiles)
    },
    [onChange]
  )
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'hover:bg-accent/30 relative rounded-sm border-2 border-dashed p-5 select-none',
        { ['border-primary']: isDragActive }
      )}
    >
      <input
        {...getInputProps()}
        accept={accept}
        max={max}
        disabled={loading}
      />
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center rounded-full border p-2.5">
          <UploadCloud className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Drag &amp; drop files here</p>
        <p className="text-muted-foreground text-xs">
          Or click to browse (max 2 files, up to 5MB each)
        </p>
      </div>
      {loading && (
        <div className="bg-accent/80 absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
          <Loader className="text-muted-foreground animate-spin" />
        </div>
      )}
    </div>
  )
}
