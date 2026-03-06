import {
  isDataFlowDialogVisibleAtom,
  isNodeSelectorSheetVisibleAtom
} from '@/stores/workflow'
import { useSetAtom } from 'jotai'
import { PlusIcon } from 'lucide-react'
import { Label } from 'recharts'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'

export function WorkflowToolbar() {
  const setIsNodeSelectorSheetVisible = useSetAtom(
    isNodeSelectorSheetVisibleAtom
  )
  const setIsDataFlowDialogVisible = useSetAtom(isDataFlowDialogVisibleAtom)
  return (
    <section className="fixed top-1.5 right-2 flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsDataFlowDialogVisible(true)}
      >
        Dialog
      </Button>
      <div className="flex items-center space-x-2">
        <Switch />
        <Label>Activate</Label>
      </div>
      <Button size="sm">Save</Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsNodeSelectorSheetVisible(true)}
      >
        <PlusIcon />
      </Button>
    </section>
  )
}
