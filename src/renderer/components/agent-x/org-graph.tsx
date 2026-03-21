import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionMode,
  type Edge,
  type EdgeChange,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  type OnNodesChange,
  Position,
  ReactFlow,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow
} from '@xyflow/react'
import { useSetAtom } from 'jotai'
import { BotIcon, Building2Icon, CopyIcon, Trash2Icon } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

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

import '@xyflow/react/dist/style.css'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import {
  type AgentData,
  type DepartmentData,
  selectedNodeAtom
} from '@/stores/agent-x'

import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle } from './ui/base-node'
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger
} from './ui/node-tooltip'
import { ZoomSlider } from './ui/zoom-slider'

// ─── Edge Styles ─────────────────────────────────────────────────────────────

// Dept → Agent: membership (gray, with arrow)
const MEMBERSHIP_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2
}

const MEMBERSHIP_MARKER = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: '#94a3b8'
}

// Agent ↔ Agent: collaboration (indigo, dashed, animated)
const COLLABORATION_STYLE = {
  stroke: '#6366f1',
  strokeWidth: 2,
  strokeDasharray: '6 3'
}

const COLLAB_MARKER = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: '#6366f1'
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
      <NodeTooltip>
        <NodeTooltipTrigger>
          <BaseNode className="min-w-52">
            <BaseNodeHeader>
              <Building2Icon className="text-primary h-4 w-4 shrink-0" />
              <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
            </BaseNodeHeader>
          </BaseNode>
        </NodeTooltipTrigger>
        {data.description && (
          <NodeTooltipContent position={Position.Bottom}>
            <p className="max-w-56 text-xs">{data.description}</p>
          </NodeTooltipContent>
        )}
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
      </NodeTooltip>
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
    <NodeTooltip>
      <NodeTooltipTrigger>
        <BaseNode
          className={cn('group min-w-44', !data.isActive && 'opacity-50')}
        >
          <BaseNodeHeader>
            <BotIcon className="text-primary h-4 w-4 shrink-0" />
            <BaseNodeHeaderTitle className="text-sm">
              {data.label}
            </BaseNodeHeaderTitle>
          </BaseNodeHeader>
        </BaseNode>
      </NodeTooltipTrigger>
      {data.description && (
        <NodeTooltipContent position={Position.Bottom}>
          <p className="max-w-56 text-xs">{data.description}</p>
        </NodeTooltipContent>
      )}

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
    </NodeTooltip>
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
  fitViewVersion?: number
  onUpdateDepartment: (id: string, data: Partial<DepartmentData>) => void
  onUpdateAgent: (id: string, data: Partial<AgentData>) => void
  onAssignDepartment: (agentId: string, departmentId: string) => void
  onUnassignDepartment: (agentId: string) => void
  onAddCollaboration: (agentAId: string, agentBId: string) => void
  onRemoveCollaboration: (agentAId: string, agentBId: string) => void
  onBulkDelete: (deptIds: string[], agentIds: string[]) => void
  onBulkDuplicate: (deptIds: string[], agentIds: string[]) => void
}

export function OrgGraph({
  departments,
  agents,
  fitViewVersion,
  onUpdateDepartment,
  onUpdateAgent,
  onAssignDepartment,
  onUnassignDepartment,
  onAddCollaboration,
  onRemoveCollaboration,
  onBulkDelete,
  onBulkDuplicate
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
          type: 'default',
          style: MEMBERSHIP_STYLE,
          markerEnd: MEMBERSHIP_MARKER,
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
          markerEnd: COLLAB_MARKER,
          markerStart: COLLAB_MARKER,
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
    (params: Connection) => {
      const src = params.source ?? ''
      const tgt = params.target ?? ''

      // Dept → Agent: membership
      if (src.startsWith('dept-') && tgt.startsWith('agent-')) {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'default',
              style: MEMBERSHIP_STYLE,
              markerEnd: MEMBERSHIP_MARKER,
              deletable: true
            },
            eds
          )
        )
        onAssignDepartment(tgt.replace('agent-', ''), src.replace('dept-', ''))
        return
      }

      // Agent → Dept: membership (reverse drag)
      if (src.startsWith('agent-') && tgt.startsWith('dept-')) {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'default',
              style: MEMBERSHIP_STYLE,
              markerEnd: MEMBERSHIP_MARKER,
              deletable: true
            },
            eds
          )
        )
        onAssignDepartment(src.replace('agent-', ''), tgt.replace('dept-', ''))
        return
      }

      // Agent → Agent: collaboration
      if (src.startsWith('agent-') && tgt.startsWith('agent-')) {
        const sourceId = src.replace('agent-', '')
        const targetId = tgt.replace('agent-', '')
        if (sourceId !== targetId) {
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                type: 'default',
                style: COLLABORATION_STYLE,
                animated: true,
                markerEnd: COLLAB_MARKER,
                markerStart: COLLAB_MARKER,
                deletable: true
              },
              eds
            )
          )
          onAddCollaboration(sourceId, targetId)
        }
      }
    },
    [setEdges, onAssignDepartment, onAddCollaboration]
  )

  // ─── Context menu helpers ──────────────────────────────────────────────────

  // Use a ref so the right-clicked node is available synchronously when the
  // context menu renders (state updates are async and would arrive too late)
  const ctxNodeRef = useRef<Node | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /** Resolve which nodes the context menu should act on. */
  const getTargetIds = useCallback(() => {
    const ctxNode = ctxNodeRef.current
    const selected = nodes.filter((n) => n.selected)
    // If right-clicked node is already selected → use full selection
    // Otherwise act on just the right-clicked node
    const targets =
      ctxNode && !selected.some((n) => n.id === ctxNode.id)
        ? [ctxNode]
        : selected
    const deptIds = targets
      .filter((n) => n.id.startsWith('dept-'))
      .map((n) => n.id.replace('dept-', ''))
    const agentIds = targets
      .filter((n) => n.id.startsWith('agent-'))
      .map((n) => n.id.replace('agent-', ''))
    return { deptIds, agentIds, count: targets.length }
  }, [nodes])

  const handleDuplicate = useCallback(() => {
    const { deptIds, agentIds } = getTargetIds()
    onBulkDuplicate(deptIds, agentIds)
  }, [getTargetIds, onBulkDuplicate])

  const handleDeleteConfirmed = useCallback(() => {
    const { deptIds, agentIds } = getTargetIds()
    onBulkDelete(deptIds, agentIds)
    setConfirmDelete(false)
  }, [getTargetIds, onBulkDelete])

  const onNodeContextMenu = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Synchronous ref update so the value is ready when ContextMenuContent renders
      ctxNodeRef.current = node
    },
    []
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

  // Initial fitView on mount
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // fitView on window resize (covers maximize / restore / panel open-close)
  useEffect(() => {
    let rafId: number
    const handleResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() =>
        fitView({ padding: 0.2, duration: 200 })
      )
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
    }
  }, [fitView])

  // fitView when nodes are added/removed (version counter bumped by parent)
  useEffect(() => {
    if (fitViewVersion === undefined || fitViewVersion === 0) return
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50)
  }, [fitViewVersion, fitView])

  const selectedCount = nodes.filter((n) => n.selected).length
  // Context menu target count: if right-clicked an unselected node → 1, else selection count
  const _ctxNode = ctxNodeRef.current
  const ctxCount =
    _ctxNode && !nodes.some((n) => n.id === _ctxNode.id && n.selected)
      ? 1
      : selectedCount

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            deleteKeyCode="Delete"
            connectionMode={ConnectionMode.Loose}
            selectionOnDrag
            panOnDrag={false}
            panOnScroll
            selectionMode={SelectionMode.Partial}
          >
            <ZoomSlider position="bottom-left" />
            <Background
              className="no-drag"
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
            />
          </ReactFlow>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {ctxCount === 0 ? (
            <ContextMenuItem disabled>No nodes selected</ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem onClick={handleDuplicate}>
                <CopyIcon />
                Duplicate{ctxCount > 1 ? ` ${ctxCount} nodes` : ''}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
                Delete{ctxCount > 1 ? ` ${ctxCount} nodes` : ''}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {ctxCount} node{ctxCount > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected departments and agents
              will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirmed}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
