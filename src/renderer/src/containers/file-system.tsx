import { Dropzone } from '@/components/drop-zone'
import { FsManage } from '@/components/fs-manage'
import { localFileAtom, selectedFileAtom } from '@/stores/file-system'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { DirectoryNode } from 'src/main/lib/ipc/file-system'

export function FileSystem() {
  const [directories, setDirectories] = useAtom(localFileAtom)
  const setSelected = useSetAtom(selectedFileAtom)

  const getDirectories = useCallback(async () => {
    const res: DirectoryNode = await window.electron.ipcRenderer.invoke(
      'get-directory-tree',
      '/Database'
    )
    setDirectories(res.children.filter((item) => item.type === 'directory'))
  }, [setDirectories])

  useEffect(() => {
    getDirectories()
  }, [getDirectories])

  return (
    <Dropzone>
      <section
        className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] grid-rows-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-8 p-4"
        onClick={() => setSelected('')}
      >
        {directories?.map((directory) => (
          <FsManage
            key={directory.path}
            type="directory"
            name={directory.name}
            path={directory.path}
          />
        ))}
      </section>
    </Dropzone>
  )
}
