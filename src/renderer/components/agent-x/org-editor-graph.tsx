import { ReactFlowProvider } from '@xyflow/react'
import type { ComponentProps } from 'react'

import { OrgGraph } from './org-graph'

// Wrapping ReactFlowProvider together with OrgGraph in this file means the
// `@xyflow/react` dependency only enters the bundle through this chunk.
// Importing this module via `React.lazy` keeps the ~200KB ReactFlow runtime
// out of the initial app bundle for users who never open the org editor.
export function OrgEditorGraph(props: ComponentProps<typeof OrgGraph>) {
  return (
    <ReactFlowProvider>
      <OrgGraph {...props} />
    </ReactFlowProvider>
  )
}

export default OrgEditorGraph
