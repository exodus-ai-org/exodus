import { cn } from '@/lib/utils'
import { ReactNode, useCallback } from 'react'
import { DropEvent, FileRejection, useDropzone } from 'react-dropzone'

export function Dropzone({ children }: { children: ReactNode }) {
  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent
    ) => {
      console.log(acceptedFiles, fileRejections, event)
      // Do something with the files
    },
    []
  )
  const {
    getRootProps,
    isDragActive
    // getInputProps,
    // isFocused,
    // isDragAccept,
    // isDragReject
  } = useDropzone({ onDrop })

  return (
    <section
      {...getRootProps()}
      className={cn('flex flex-1 flex-col transition-all', {
        ['m-4 border-2 border-dashed transition-all']: isDragActive
      })}
    >
      {children}
    </section>
  )
}
