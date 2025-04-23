import { FsManage } from '@/components/fs-manage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useFs } from '@/hooks/use-fs'
import { selectedFileAtom } from '@/stores/file-system'
import { useSetAtom } from 'jotai'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

export function FileSystem() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const { directories, createDirectory, getDirectories } = useFs()
  const setSelected = useSetAtom(selectedFileAtom)

  useEffect(() => {
    getDirectories()
  }, [getDirectories])

  return (
    <section className="p-4">
      <div className="mb-8 flex justify-end">
        <Button
          variant="secondary"
          className="cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <PlusCircle /> Create Directory
        </Button>
      </div>

      <section
        className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] grid-rows-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-8"
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create Directory</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setName('')
                }}
              >
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={async () => {
                setOpen(false)
                setName('')
                await createDirectory(name)
                await getDirectories()
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
