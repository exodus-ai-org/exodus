import FolderImg from '@/assets/icons/macos-folder-original.svg'
import { Dropzone } from '@/components/drop-zone'
import { FsManage } from '@/components/fs-manage'
import { useFs } from '@/hooks/use-fs'
import { selectedFileAtom } from '@/stores/file-system'
import { useSetAtom } from 'jotai'
import { ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'

export function FileSystemDetail() {
  const navigate = useNavigate()
  const setSelected = useSetAtom(selectedFileAtom)
  const { directoryName } = useParams()
  const { directories, getDirectories } = useFs()
  const files = directories?.find(
    (directory) => directory.name === directoryName
  )?.children

  useEffect(() => {
    if (directoryName) {
      getDirectories()
    }
  }, [directoryName, getDirectories])

  if (!directoryName) {
    return null
  }

  return (
    <section className="p-4">
      <div className="mb-8 flex items-center gap-4">
        <ChevronLeft onClick={() => navigate(-1)} className="cursor-pointer" />
        <div className="flex items-center gap-2">
          <img src={FolderImg} alt="" className="w-4" />
          <p className="max-w-2xs truncate text-sm">{directoryName}</p>
        </div>
      </div>

      <Dropzone directoryName={directoryName}>
        <section
          className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] grid-rows-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-8 p-4"
          onClick={() => setSelected('')}
        >
          {files?.map((file) => (
            <FsManage
              key={file.path}
              type="file"
              name={file.name}
              path={file.path}
            />
          ))}
        </section>
      </Dropzone>
    </section>
  )
}
