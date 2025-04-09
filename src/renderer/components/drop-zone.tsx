import { useFs } from '@/hooks/use-fs'
import { cn } from '@/lib/utils'
import { ReactNode, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export function Dropzone({
  directoryName,
  children
}: {
  directoryName: string
  children: ReactNode
}) {
  const { copyFiles } = useFs()

  const onDrop = useCallback(
    (
      acceptedFiles: File[]
      // fileRejections: FileRejection[],
      // event: DropEvent
    ) => {
      copyFiles(acceptedFiles, directoryName)
    },
    [copyFiles, directoryName]
  )

  const {
    getRootProps,
    isDragActive
    // getInputProps
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
