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
  ConnectionMode,
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
import { BotIcon, Building2Icon } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle
} from './ui/base-node'
import { ZoomSlider } from './ui/zoom-slider'

// ─── Edge Styles ─────────────────────────────────────────────────────────────

// Dept → Agent: membership (gray, no arrow)
const MEMBERSHIP_STYLE = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeWidth: 1.5,
  opacity: 0.5
}

// Agent ↔ Agent: collaboration (primary color, dashed, animated)
const COLLABORATION_STYLE = {
  stroke: 'hsl(var(--primary))',
  strokeWidth: 2,
  strokeDasharray: '6 3'
}

// ─── Department Node ─────────────────────────────────────────────────────────

interface DepartmentNodeData {
  label: string
  description: string
  departmentId: string
  [key: string]: unknown
}

const DepartmentNodeComponent = memo(
  ({ data }: NodeProps<Node<DepartmentNodeData>>) => {
    return (
      <BaseNode className="min-w-52">
        {/* Source handle on the bottom — drag to an Agent to assign it */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="dept-source"
          className={cn(
            '!h-3 !w-3 !rounded-full !border-2',
            '!border-muted-foreground !bg-background'
          )}
        />
        <BaseNodeHeader>
          <Building2Icon className="text-primary h-4 w-4 shrink-0" />
          <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
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
  hasDept: boolean
  agentId: string
  [key: string]: unknown
}

const AgentNodeComponent = memo(({ data }: NodeProps<Node<AgentNodeData>>) => {
  return (
    <BaseNode className={cn('group min-w-44', !data.isActive && 'opacity-50')}>
      {/* Top handle: receives dept membership edge */}
      <Handle
        type="target"
        position={Position.Top}
        id="member-target"
        className={cn(
          '!h-3 !w-3 !rounded-full !border-2',
          data.hasDept
            ? '!border-muted-foreground !bg-muted-foreground'
            : '!border-muted-foreground !bg-background'
        )}
      />

      {/* Left handle: receives collaboration edges */}
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

      {/* Right handle: start a collaboration edge */}
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
  onUpdateDepartment: (id: string, data: Partial<DepartmentData>) => void
  onUpdateAgent: (id: string, data: Partial<AgentData>) => void
  onAssignDepartment: (agentId: string, departmentId: string) => void
  onUnassignDepartment: (agentId: string) => void
  onAddCollaboration: (agentAId: string, agentBId: string) => void
  onRemoveCollaboration: (agentAId: string, agentBId: string) => void
}

export function OrgGraph({
  departments,
  agents,
  onUpdateDepartment,
  onUpdateAgent,
  onAssignDepartment,
  onUnassignDepartment,
  onAddCollaboration,
  onRemoveCollaboration
}: OrgGraphProps) {
  const setSelectedNode = useSetAtom(selectedNodeAtom)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const { fitView } = useReactFlow()

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
          departmentId: dept.id
        }
      })
    }

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
          hasDept: ag.departmentId != null,
          agentId: ag.id
        }
      })

      // Membership edge (only when agent has a dept)
      if (ag.departmentId) {
        newEdges.push({
          id: `member-${ag.departmentId}-${ag.id}`,
          source: `dept-${ag.departmentId}`,
          sourceHandle: 'dept-source',
          target: `agent-${ag.id}`,
          targetHandle: 'member-target',
          type: 'smoothstep',
          style: MEMBERSHIP_STYLE,
          deletable: true
        })
      }

      // Collaboration edges (deduplicated)
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
          style: COLLABORATION_STYLE,
          animated: true,
          label: 'collab',
          labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
          labelBgStyle: { fill: 'hsl(var(--background))' },
          markerEnd: { type: 'arrowclosed' as const },
          deletable: true
        })
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [departments, agents])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds))
      for (const c of changes) {
        if (c.type !== 'position' || c.dragging !== false || !c.position)
          continue
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
      // Snapshot edges before applying changes so we can identify what was removed
      const removals = changes
        .filter((c) => c.type === 'remove')
        .map((c) => edges.find((e) => e.id === (c as { id: string }).id))
        .filter((e): e is Edge => !!e)

      setEdges((eds) => applyEdgeChanges(changes, eds))

      for (const removed of removals) {
        if (removed.id.startsWith('member-')) {
          // Deleting a membership edge → unassign dept from agent
          const agentId = removed.target.replace('agent-', '')
          onUnassignDepartment(agentId)
        } else if (removed.id.startsWith('collab-')) {
          const sourceId = removed.source.replace('agent-', '')
          const targetId = removed.target.replace('agent-', '')
          onRemoveCollaboration(sourceId, targetId)
        }
      }
    },
    [edges, onUnassignDepartment, onRemoveCollaboration]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const src = connection.source ?? ''
      const tgt = connection.target ?? ''

      const srcIsDept = src.startsWith('dept-')
      const tgtIsAgent = tgt.startsWith('agent-')
      const srcIsAgent = src.startsWith('agent-')
      const tgtIsAgent2 = tgt.startsWith('agent-')

      // Dept → Agent: assign membership
      if (srcIsDept && tgtIsAgent) {
        onAssignDepartment(tgt.replace('agent-', ''), src.replace('dept-', ''))
        return
      }

      // Agent → Dept: also assign membership (user may drag in reverse)
      if (srcIsAgent && tgt.startsWith('dept-')) {
        onAssignDepartment(src.replace('agent-', ''), tgt.replace('dept-', ''))
        return
      }

      // Agent → Agent: collaboration
      if (srcIsAgent && tgtIsAgent2) {
        const sourceId = src.replace('agent-', '')
        const targetId = tgt.replace('agent-', '')
        if (sourceId !== targetId) {
          onAddCollaboration(sourceId, targetId)
        }
      }
    },
    [onAssignDepartment, onAddCollaboration]
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

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
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
        connectionMode={ConnectionMode.Loose}
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
