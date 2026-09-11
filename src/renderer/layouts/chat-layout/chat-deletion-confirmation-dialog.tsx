import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

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
import { deleteChat } from '@/services/chat'
import { toBeDeletedChatAtom } from '@/stores/chat'

export function ChatDeletionConfirmationDialog() {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const [toBeDeletedChat, setToBeDeletedChat] = useAtom(toBeDeletedChatAtom)

  return (
    <AlertDialog
      open={toBeDeletedChat !== undefined}
      onOpenChange={() => {
        setToBeDeletedChat(undefined)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete <strong>{toBeDeletedChat?.title}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={async () => {
              if (!toBeDeletedChat) return
              await deleteChat(toBeDeletedChat, id)
              setToBeDeletedChat(undefined)
            }}
          >
            {t('action.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
