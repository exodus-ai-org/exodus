import FolderImg from '@/assets/icons/macos-folder-original.svg'
import { FsManage } from '@/components/fs-manage'
import { localFileAtom, selectedFileAtom } from '@/stores/file-system'
import { useAtomValue, useSetAtom } from 'jotai'
import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'

export function FileSystemDetail() {
  const navigate = useNavigate()
  const setSelected = useSetAtom(selectedFileAtom)
  const { folderName } = useParams()
  const directories = useAtomValue(localFileAtom)
  const files = directories?.find(
    (directory) => directory.name === folderName
  )?.children

  if (!folderName) {
    return null
  }

  return (
    <section className="p-4">
      <div className="mb-8 flex items-center gap-4">
        <ChevronLeft onClick={() => navigate(-1)} className="cursor-pointer" />
        <div className="flex items-center gap-2">
          <img src={FolderImg} alt="" className="w-4" />
          <p className="max-w-2xs truncate text-sm">{folderName}</p>
        </div>
      </div>

      <section
        className="grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-8"
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
    </section>
  )
}
