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
import { renamedChatTitleAtom } from '@/stores/chat'
import { useAtom } from 'jotai'

export function RenameChatDialog() {
  const [renamedChatTitle, setRenamedChatTitle] = useAtom(renamedChatTitleAtom)
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
          <AlertDialogDescription>
            <Input
              className="text-foreground"
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
              updateChat({
                id: renamedChatTitle.id,
                title: renamedChatTitle.title
              })
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
