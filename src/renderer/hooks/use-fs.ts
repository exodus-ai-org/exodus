import { localFileAtom } from '@/stores/file-system'
import { LOCAL_FILE_DIRECTORY } from '@shared/constants'
import { DirectoryNode } from '@shared/types/fs'
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { toast } from 'sonner'

export function useFs() {
  const [directories, setDirectories] = useAtom(localFileAtom)

  const getBasePath = useCallback(async () => {
    const userDataPath: string =
      await window.electron.ipcRenderer.invoke('get-user-data-path')
    return `${userDataPath}/${LOCAL_FILE_DIRECTORY}`
  }, [])

  const getDirectories = useCallback(async () => {
    const basePath = await getBasePath()
    const res: DirectoryNode = await window.electron.ipcRenderer.invoke(
      'get-directory-tree',
      basePath
    )

    setDirectories(res.children.filter((item) => item.type === 'directory'))
  }, [getBasePath, setDirectories])

  const createDirectory = useCallback(
    async (directoryName: string) => {
      const basePath = await getBasePath()

      await window.electron.ipcRenderer.invoke(
        'create-directory',
        `${basePath}/${directoryName}`
      )
      toast.success(`${directoryName} created!`)
      getDirectories()
    },
    [getBasePath, getDirectories]
  )

  const copyFiles = useCallback(
    async (files: File[], directoryName: string) => {
      const basePath = await getBasePath()
      const absolutePath = `${basePath}/${directoryName}`
      const arrayBuffers = await Promise.all(
        files.map((file) => file.arrayBuffer())
      )
      const buffers = files.map((file, idx) => ({
        name: file.name,
        buffer: arrayBuffers[idx]
      }))

      await window.electron.ipcRenderer.invoke(
        'copy-files',
        buffers,
        absolutePath
      )

      getDirectories()
    },
    [getBasePath, getDirectories]
  )

  return {
    directories,
    getDirectories,
    createDirectory,
    copyFiles
  }
}
