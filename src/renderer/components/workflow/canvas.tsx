import { BaseNodeFullDemo } from '@/components/workflow-ui/node'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState } from 'react'
import { ZoomSlider } from '../workflow-ui/zoom-slider'

const initialNodes = [
  {
    id: 'n1',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1' },
    type: 'baseNodeFull'
  },
  {
    id: 'n2',
    position: { x: 160, y: 0 },
    data: { label: 'Node 2' },
    type: 'baseNodeFull'
  }
]
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }]

export function Canvas() {
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  )
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  )
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      nodeTypes={{
        baseNodeFull: BaseNodeFullDemo
      }}
    >
      <ZoomSlider />
      <Background
        className="no-draggable"
        variant={BackgroundVariant.Cross}
        gap={12}
        size={1}
      />
    </ReactFlow>
  )
}
