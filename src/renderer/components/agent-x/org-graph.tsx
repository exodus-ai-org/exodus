import { cn } from '@/lib/utils'
import {
  type AgentData,
  type DepartmentData,
  selectedNodeAtom
} from '@/stores/agent-x'
import {
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type EdgeChange,
  Handle,
  type Node,
  type NodeProps,
  type OnNodesChange,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useSetAtom } from 'jotai'
import { BotIcon, Building2Icon, PlusIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle
} from './ui/base-node'
import { ZoomSlider } from './ui/zoom-slider'

// ─── Edge Styles ─────────────────────────────────────────────────────────────

const MEMBERSHIP_EDGE_STYLE = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeWidth: 1.5,
  opacity: 0.5
}

const COLLABORATION_EDGE_STYLE = {
  stroke: 'hsl(var(--primary))',
  strokeWidth: 2,
  strokeDasharray: '6 3'
}

// ─── Department Node ─────────────────────────────────────────────────────────

interface DepartmentNodeData {
  label: string
  description: string
  departmentId: string
  onAddAgent: (departmentId: string) => void
  [key: string]: unknown
}

const DepartmentNodeComponent = memo(
  ({ data }: NodeProps<Node<DepartmentNodeData>>) => {
    return (
      <BaseNode className="group min-w-52">
        <BaseNodeHeader>
          <Building2Icon className="text-primary h-4 w-4 shrink-0" />
          <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
          {/* + button: add agent to this department */}
          <button
            className={cn(
              'nodrag nopan ml-auto flex h-5 w-5 shrink-0 items-center justify-center',
              'rounded-full border border-dashed opacity-0 group-hover:opacity-100',
              'hover:bg-muted cursor-pointer transition-opacity'
            )}
            onClick={(e) => {
              e.stopPropagation()
              data.onAddAgent(data.departmentId)
            }}
            title="Add agent to this department"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </BaseNodeHeader>
        {data.description && (
          <BaseNodeContent>
            <p className="text-muted-foreground text-xs">{data.description}</p>
          </BaseNodeContent>
        )}
      </BaseNode>
    )
  }
)
DepartmentNodeComponent.displayName = 'DepartmentNode'

// ─── Agent Node ──────────────────────────────────────────────────────────────

interface AgentNodeData {
  label: string
  description: string
  isActive: boolean
  agentId: string
  [key: string]: unknown
}

const AgentNodeComponent = memo(({ data }: NodeProps<Node<AgentNodeData>>) => {
  return (
    <BaseNode className={cn('group min-w-44', !data.isActive && 'opacity-50')}>
      {/* Collaboration target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="collab-target"
        className={cn(
          '!h-3 !w-3 !rounded-full !border-2',
          '!border-primary !bg-background',
          'opacity-0 transition-opacity group-hover:opacity-100'
        )}
      />

      <BaseNodeHeader>
        <BotIcon className="text-primary h-4 w-4 shrink-0" />
        <BaseNodeHeaderTitle className="text-sm">
          {data.label}
        </BaseNodeHeaderTitle>
      </BaseNodeHeader>
      {data.description && (
        <BaseNodeContent>
          <p className="text-muted-foreground text-xs">{data.description}</p>
        </BaseNodeContent>
      )}

      {/* Collaboration source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="collab-source"
        className={cn(
          '!h-3 !w-3 !rounded-full !border-2',
          '!border-primary !bg-primary',
          'opacity-0 transition-opacity group-hover:opacity-100'
        )}
      />
    </BaseNode>
  )
})
AgentNodeComponent.displayName = 'AgentNode'

// ─── Node Type Map ────────────────────────────────────────────────────────────

const nodeTypes = {
  department: DepartmentNodeComponent,
  agent: AgentNodeComponent
}

// ─── Main OrgGraph ────────────────────────────────────────────────────────────

interface OrgGraphProps {
  departments: DepartmentData[]
  agents: AgentData[]
  onCreateAgent: (departmentId: string) => void
  onUpdateDepartment: (id: string, data: Partial<DepartmentData>) => void
  onUpdateAgent: (id: string, data: Partial<AgentData>) => void
  onAddCollaboration: (agentAId: string, agentBId: string) => void
  onRemoveCollaboration: (agentAId: string, agentBId: string) => void
}

export function OrgGraph({
  departments,
  agents,
  onCreateAgent,
  onUpdateDepartment,
  onUpdateAgent,
  onAddCollaboration,
  onRemoveCollaboration
}: OrgGraphProps) {
  const setSelectedNode = useSetAtom(selectedNodeAtom)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const { fitView } = useReactFlow()

  // Rebuild nodes and edges whenever data changes
  useEffect(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    for (const dept of departments) {
      newNodes.push({
        id: `dept-${dept.id}`,
        type: 'department',
        position: dept.position ?? { x: 0, y: 0 },
        data: {
          label: dept.name,
          description: dept.description ?? '',
          departmentId: dept.id,
          onAddAgent: onCreateAgent
        }
      })
    }

    // Track already-emitted collaboration edges to avoid duplicates
    const emittedCollab = new Set<string>()

    for (const ag of agents) {
      newNodes.push({
        id: `agent-${ag.id}`,
        type: 'agent',
        position: ag.position ?? { x: 0, y: 0 },
        data: {
          label: ag.name,
          description: ag.description ?? '',
          isActive: ag.isActive ?? true,
          agentId: ag.id
        }
      })

      // Membership edge: dept → agent
      newEdges.push({
        id: `member-${ag.departmentId}-${ag.id}`,
        source: `dept-${ag.departmentId}`,
        target: `agent-${ag.id}`,
        targetHandle: 'collab-target',
        type: 'smoothstep',
        style: MEMBERSHIP_EDGE_STYLE,
        markerEnd: undefined
      })

      // Collaboration edges: agent ↔ agent (deduplicated)
      for (const peerId of ag.collaboratorIds ?? []) {
        const key = [ag.id, peerId].sort().join('--')
        if (emittedCollab.has(key)) continue
        emittedCollab.add(key)

        newEdges.push({
          id: `collab-${key}`,
          source: `agent-${ag.id}`,
          sourceHandle: 'collab-source',
          target: `agent-${peerId}`,
          targetHandle: 'collab-target',
          type: 'default',
          style: COLLABORATION_EDGE_STYLE,
          animated: true,
          label: 'collab',
          labelStyle: {
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10
          },
          labelBgStyle: { fill: 'hsl(var(--background))' },
          markerEnd: { type: 'arrowclosed' as const }
        })
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [departments, agents, onCreateAgent])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds))

      // Persist position on drag end
      for (const c of changes) {
        if (c.type !== 'position' || c.dragging !== false || !c.position) {
          continue
        }
        if (c.id.startsWith('dept-')) {
          onUpdateDepartment(c.id.replace('dept-', ''), {
            position: c.position
          })
        } else if (c.id.startsWith('agent-')) {
          onUpdateAgent(c.id.replace('agent-', ''), { position: c.position })
        }
      }
    },
    [onUpdateDepartment, onUpdateAgent]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Collect collaboration edges being removed before state update
      const removals = changes
        .filter((c) => c.type === 'remove')
        .map((c) => edges.find((e) => e.id === (c as { id: string }).id))
        .filter((e): e is Edge => !!e && e.id.startsWith('collab-'))

      setEdges((eds) => applyEdgeChanges(changes, eds))

      for (const removed of removals) {
        const sourceId = removed.source.replace('agent-', '')
        const targetId = removed.target.replace('agent-', '')
        onRemoveCollaboration(sourceId, targetId)
      }
    },
    [edges, onRemoveCollaboration]
  )

  // User draws edge from one agent to another → collaboration
  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source?.startsWith('agent-') ||
        !connection.target?.startsWith('agent-')
      ) {
        return
      }
      const sourceId = connection.source.replace('agent-', '')
      const targetId = connection.target.replace('agent-', '')
      if (sourceId === targetId) return
      onAddCollaboration(sourceId, targetId)
    },
    [onAddCollaboration]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('dept-')) {
        setSelectedNode({
          type: 'department',
          id: node.id.replace('dept-', '')
        })
      } else if (node.id.startsWith('agent-')) {
        setSelectedNode({ type: 'agent', id: node.id.replace('agent-', '') })
      }
    },
    [setSelectedNode]
  )

  // Fit view when nodes are first loaded
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode="Delete"
      >
        <ZoomSlider position="bottom-left" />
        <Background
          className="no-draggable"
          variant={BackgroundVariant.Cross}
          gap={20}
          size={1}
        />
      </ReactFlow>
    </div>
  )
}
