import { Canvas } from '@/components/workflow/canvas'
import { DataFlowDialog } from '@/components/workflow/data-flow-dialog'
import { NodeSelectorSheet } from '@/components/workflow/node-selector-sheet'
import { Toolbar } from '@/components/workflow/toolbar'

export function Workflow() {
  return (
    <div className="flex h-[calc(100dvh-44px)] w-[calc(100vw-44px)]">
      <Toolbar />
      <Canvas />
      <NodeSelectorSheet />
      <DataFlowDialog />
    </div>
  )
}
