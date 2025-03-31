import FileImg from '@/assets/icons/macos-file-original.png'
import FolderImg from '@/assets/icons/macos-folder-original.svg'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { selectedFileAtom } from '@/stores/file-system'
import { useAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

type FileType = 'directory' | 'file'

function getIcon(type: FileType) {
  if (type === 'directory')
    return <img src={FolderImg} alt="" className="w-16" />
  if (type === 'file') return <img src={FileImg} alt="" className="w-16" />
  return null
}

function getPlatformFileManagementName() {
  const { platform } = window.electron.process
  if (platform === 'darwin') return 'Finder'
  if (platform === 'win32') return 'File Explorer'
  return ''
}

export function FsManage({
  type,
  name,
  path
}: {
  type: FileType
  name: string
  path: string
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useAtom(selectedFileAtom)

  const navigate = useNavigate()
  const platformName = useMemo(() => getPlatformFileManagementName(), [])

  const toDetailPage = () => {
    if (type === 'directory') {
      navigate(`/file-system/${name}`)
    }
  }

  const showStat = async () => {
    const res = await window.electron.ipcRenderer.invoke('get-stat', path)
    console.log(res)
  }

  const openFileManagerApp = () => {
    window.electron.ipcRenderer.send('open-file-manager-app', path)
  }

  const handleCopy = async () => {
    try {
      await window.navigator.clipboard.writeText(name)
      toast.success('Copied!')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to copy, please try again!'
      )
    }
  }

  const handleSelectFile = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    needStopPropagation?: boolean
  ) => {
    if (needStopPropagation) {
      e.stopPropagation()
    }
    setSelected(path)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className="flex flex-col items-center gap-1"
            onDoubleClick={toDetailPage}
            onClick={(e) => handleSelectFile(e, true)}
            onContextMenu={handleSelectFile}
          >
            <div
              className={cn('p-1', {
                ['bg-accent rounded-sm']: selected === path
              })}
            >
              {getIcon(type)}
            </div>
            <p
              className={cn(
                'line-clamp-2 max-w-24 cursor-default p-0.5 py-px text-center text-xs break-words',
                {
                  ['bg-fs-name-select rounded-xs text-white']: selected === path
                }
              )}
            >
              {name}
            </p>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {type === 'directory' && (
            <ContextMenuItem inset onClick={toDetailPage}>
              Open in New Tab
            </ContextMenuItem>
          )}
          <ContextMenuItem inset>Move to Trash</ContextMenuItem>
          <ContextMenuItem inset onSelect={() => setOpen(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem inset onClick={showStat}>
            Quick Look
          </ContextMenuItem>
          <ContextMenuItem inset onClick={handleCopy}>
            Copy Name
          </ContextMenuItem>
          {platformName !== '' && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem inset onClick={openFileManagerApp}>
                Open in {platformName}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col">
          <DialogHeader>
            <DialogTitle>Rename {type}</DialogTitle>
          </DialogHeader>
          <Input value={name} className="col-span-3" />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
