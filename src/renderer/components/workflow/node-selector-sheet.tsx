import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { isNodeSelectorSheetVisibleAtom } from '@/stores/workflow'
import { useAtom } from 'jotai'

export function NodeSelectorSheet() {
  const [open, setOpen] = useAtom(isNodeSelectorSheetVisibleAtom)

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetContent className="mt-12">
        <SheetHeader>
          <SheetTitle>What happens next?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
