import { useAtom, useSetAtom } from 'jotai'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { updateChat } from '@/services/chat'
import { openTabsAtom, renamedChatTitleAtom } from '@/stores/chat'

export function RenameChatDialog() {
  const [renamedChatTitle, setRenamedChatTitle] = useAtom(renamedChatTitleAtom)
  const setOpenTabs = useSetAtom(openTabsAtom)
  const reset = () => setRenamedChatTitle({ id: '', title: '', open: false })

  return (
    <AlertDialog
      open={renamedChatTitle.open}
      onOpenChange={(open) => {
        if (!open) {
          reset()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rename Chat</AlertDialogTitle>
          <AlertDialogDescription className="w-full">
            <Input
              className="text-foreground mt-2"
              value={renamedChatTitle.title}
              onChange={(e) =>
                setRenamedChatTitle({
                  ...renamedChatTitle,
                  title: e.target.value
                })
              }
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={reset}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const { id, title } = renamedChatTitle
              updateChat({ id, title })
              setOpenTabs((prev) =>
                prev.map((t) => (t.id === id ? { ...t, title } : t))
              )
              reset()
            }}
          >
            Submit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
