import { Canvas } from '@/components/workflow/canvas'
import { DataFlowDialog } from '@/components/workflow/data-process-dialog'
import { NodeSelectorSheet } from '@/components/workflow/node-selector-sheet'
import { HttpRequestForm } from '@/components/workflow/nodes/data-source/http-request'
import { WorkflowToolbar } from '@/components/workflow/workflow-toolbar'

export function Workflow() {
  return (
    <div className="flex h-full w-full">
      <WorkflowToolbar />
      <Canvas />
      <NodeSelectorSheet />
      <DataFlowDialog>
        <HttpRequestForm />
      </DataFlowDialog>
    </div>
  )
}
