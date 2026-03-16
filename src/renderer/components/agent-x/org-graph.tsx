import { cn } from '@/lib/utils'
import {
  type AgentData,
  type DepartmentData,
  selectedNodeAtom
} from '@/stores/agent-x'
import {
  Background,
  BackgroundVariant,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodesChange,
  ReactFlow,
  applyNodeChanges
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

// ─── Custom Nodes ───────────────────────────────────────────────────────────

interface DepartmentNodeData {
  label: string
  description: string
  icon: string
  departmentId: string
  [key: string]: unknown
}

const DepartmentNodeComponent = memo(
  ({ data }: NodeProps<Node<DepartmentNodeData>>) => {
    return (
      <BaseNode className="min-w-55">
        <BaseNodeHeader>
          <Building2Icon className="text-primary h-4 w-4" />
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

interface AgentNodeData {
  label: string
  description: string
  isActive: boolean
  agentId: string
  [key: string]: unknown
}

const AgentNodeComponent = memo(({ data }: NodeProps<Node<AgentNodeData>>) => {
  return (
    <BaseNode className={cn('min-w-45', !data.isActive && 'opacity-50')}>
      <BaseNodeHeader>
        <BotIcon className="text-primary h-4 w-4" />
        <BaseNodeHeaderTitle className="text-sm">
          {data.label}
        </BaseNodeHeaderTitle>
      </BaseNodeHeader>
      {data.description && (
        <BaseNodeContent>
          <p className="text-muted-foreground text-xs">{data.description}</p>
        </BaseNodeContent>
      )}
    </BaseNode>
  )
})
AgentNodeComponent.displayName = 'AgentNode'

// ─── Node Type Map ──────────────────────────────────────────────────────────

const nodeTypes = {
  department: DepartmentNodeComponent,
  agent: AgentNodeComponent
}

// ─── Main OrgGraph ──────────────────────────────────────────────────────────

interface OrgGraphProps {
  departments: DepartmentData[]
  agents: AgentData[]
  onCreateAgent: (departmentId: string) => void
  onUpdateDepartment: (id: string, data: Partial<DepartmentData>) => void
  onUpdateAgent: (id: string, data: Partial<AgentData>) => void
}

export function OrgGraph({
  departments,
  agents,
  onCreateAgent,
  onUpdateDepartment,
  onUpdateAgent
}: OrgGraphProps) {
  const setSelectedNode = useSetAtom(selectedNodeAtom)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  // Build nodes and edges from data
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
          icon: dept.icon ?? 'building-2',
          departmentId: dept.id
        }
      })
    }

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

      newEdges.push({
        id: `edge-${ag.departmentId}-${ag.id}`,
        source: `dept-${ag.departmentId}`,
        target: `agent-${ag.id}`,
        type: 'default'
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [departments, agents])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds))

      // Persist position changes on drag end
      for (const c of changes) {
        if (c.type !== 'position' || c.dragging !== false || !c.position) {
          continue
        }
        if (c.id.startsWith('dept-')) {
          onUpdateDepartment(c.id.replace('dept-', ''), {
            position: c.position
          })
        } else if (c.id.startsWith('agent-')) {
          onUpdateAgent(c.id.replace('agent-', ''), {
            position: c.position
          })
        }
      }
    },
    [onUpdateDepartment, onUpdateAgent]
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

  // Context menu for adding agent to department
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'department') {
        const deptId = node.id.replace('dept-', '')
        onCreateAgent(deptId)
      }
    },
    [onCreateAgent]
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
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
