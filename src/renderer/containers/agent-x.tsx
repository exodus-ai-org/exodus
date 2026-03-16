import { AgentConfigPanel } from '@/components/agent-x/agent-config-panel'
import { DepartmentConfigPanel } from '@/components/agent-x/department-config-panel'
import { ExecutionTimeline } from '@/components/agent-x/execution-timeline'
import { McpManagerDialog } from '@/components/agent-x/mcp-manager-dialog'
import { OrgGraph } from '@/components/agent-x/org-graph'
import { TaskDispatchDialog } from '@/components/agent-x/task-dispatch-dialog'
import { TaskList } from '@/components/agent-x/task-list'
import { Button } from '@/components/ui/button'
import {
  createAgentApi,
  createDepartment,
  deleteAgentApi,
  deleteDepartment,
  getAgents,
  getDepartments,
  getTasks,
  updateAgentApi,
  updateDepartment
} from '@/services/agent-x'
import {
  type AgentData,
  type DepartmentData,
  type TaskData,
  isTaskDispatchDialogOpenAtom,
  selectedNodeAtom
} from '@/stores/agent-x'
import { BASE_URL } from '@shared/constants/systems'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import { ReactFlowProvider } from '@xyflow/react'
import { useAtom } from 'jotai'
import { BotIcon, Building2Icon, PlugIcon, SendIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export function AgentXContainer() {
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [events, setEvents] = useState<AgentXSseEvent[]>([])
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const [, setDispatchOpen] = useAtom(isTaskDispatchDialogOpenAtom)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false)
  const [fitViewVersion, setFitViewVersion] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  const bumpFitView = useCallback(() => setFitViewVersion((v) => v + 1), [])

  const loadData = useCallback(async () => {
    const [depts, ags, ts] = await Promise.all([
      getDepartments(),
      getAgents(),
      getTasks()
    ])
    setDepartments(depts)
    setAgents(ags)
    setTasks(ts)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/api/agent-x/sse`)
    eventSourceRef.current = es
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentXSseEvent
        setEvents((prev) => [...prev.slice(-200), event])
        if (
          event.type === 'task_status' ||
          event.type === 'task_completed' ||
          event.type === 'task_failed'
        ) {
          getTasks().then(setTasks)
        }
      } catch {
        // ignore parse errors
      }
    }
    return () => es.close()
  }, [])

  // ─── Department handlers ──────────────────────────────────────────────────

  const handleCreateDepartment = useCallback(async () => {
    const dept = await createDepartment({
      name: 'New Department',
      description: '',
      position: { x: 100 + departments.length * 300, y: 100 }
    })
    setDepartments((prev) => [...prev, dept])
    bumpFitView()
  }, [departments.length, bumpFitView])

  const handleUpdateDepartment = useCallback(
    async (id: string, data: Partial<DepartmentData>) => {
      const updated = await updateDepartment(id, data)
      setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)))
    },
    []
  )

  const handleDeleteDepartment = useCallback(
    async (id: string) => {
      await deleteDepartment(id)
      setDepartments((prev) => prev.filter((d) => d.id !== id))
      setAgents((prev) =>
        prev.map((a) =>
          a.departmentId === id ? { ...a, departmentId: null } : a
        )
      )
      setSelectedNode((cur) => (cur?.id === id ? null : cur))
      bumpFitView()
    },
    [setSelectedNode, bumpFitView]
  )

  // ─── Agent handlers ───────────────────────────────────────────────────────

  // Create a free-floating agent with no department
  const handleCreateAgent = useCallback(async () => {
    const ag = await createAgentApi({
      name: 'New Agent',
      description: '',
      position: { x: 200 + agents.length * 180, y: 300 }
    })
    setAgents((prev) => [...prev, ag])
    bumpFitView()
  }, [agents.length, bumpFitView])

  const handleUpdateAgent = useCallback(
    async (id: string, data: Partial<AgentData>) => {
      const updated = await updateAgentApi(id, data)
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)))
    },
    []
  )

  const handleDeleteAgent = useCallback(
    async (id: string) => {
      await deleteAgentApi(id)
      setAgents((prev) => prev.filter((a) => a.id !== id))
      setSelectedNode((cur) => (cur?.id === id ? null : cur))
      bumpFitView()
    },
    [setSelectedNode, bumpFitView]
  )

  // ─── Membership handlers ──────────────────────────────────────────────────

  const handleAssignDepartment = useCallback(
    async (agentId: string, departmentId: string) => {
      // Optimistic update so the edge appears instantly
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, departmentId } : a))
      )
      try {
        const updated = await updateAgentApi(agentId, { departmentId })
        setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
      } catch {
        // Rollback
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, departmentId: null } : a))
        )
      }
    },
    []
  )

  const handleUnassignDepartment = useCallback(
    async (agentId: string) => {
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, departmentId: null } : a))
      )
      try {
        const updated = await updateAgentApi(agentId, { departmentId: null })
        setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
      } catch {
        loadData() // Can't easily rollback without prior value, just reload
      }
    },
    [loadData]
  )

  // ─── Collaboration handlers ───────────────────────────────────────────────

  const handleAddCollaboration = useCallback(
    async (agentAId: string, agentBId: string) => {
      const agentA = agents.find((a) => a.id === agentAId)
      const agentB = agents.find((a) => a.id === agentBId)
      if (!agentA || !agentB) return
      const aCollabs = agentA.collaboratorIds ?? []
      if (aCollabs.includes(agentBId)) return
      const bCollabs = agentB.collaboratorIds ?? []
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id === agentAId)
            return { ...a, collaboratorIds: [...aCollabs, agentBId] }
          if (a.id === agentBId)
            return { ...a, collaboratorIds: [...bCollabs, agentAId] }
          return a
        })
      )
      try {
        const [updatedA, updatedB] = await Promise.all([
          updateAgentApi(agentAId, {
            collaboratorIds: [...aCollabs, agentBId]
          }),
          updateAgentApi(agentBId, { collaboratorIds: [...bCollabs, agentAId] })
        ])
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id === agentAId) return updatedA
            if (a.id === agentBId) return updatedB
            return a
          })
        )
      } catch {
        // Rollback
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id === agentAId) return { ...a, collaboratorIds: aCollabs }
            if (a.id === agentBId) return { ...a, collaboratorIds: bCollabs }
            return a
          })
        )
      }
    },
    [agents]
  )

  const handleRemoveCollaboration = useCallback(
    async (agentAId: string, agentBId: string) => {
      const agentA = agents.find((a) => a.id === agentAId)
      const agentB = agents.find((a) => a.id === agentBId)
      if (!agentA || !agentB) return
      const aCollabs = agentA.collaboratorIds ?? []
      const bCollabs = agentB.collaboratorIds ?? []
      // Optimistic update
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id === agentAId)
            return {
              ...a,
              collaboratorIds: aCollabs.filter((id) => id !== agentBId)
            }
          if (a.id === agentBId)
            return {
              ...a,
              collaboratorIds: bCollabs.filter((id) => id !== agentAId)
            }
          return a
        })
      )
      try {
        const [updatedA, updatedB] = await Promise.all([
          updateAgentApi(agentAId, {
            collaboratorIds: aCollabs.filter((id) => id !== agentBId)
          }),
          updateAgentApi(agentBId, {
            collaboratorIds: bCollabs.filter((id) => id !== agentAId)
          })
        ])
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id === agentAId) return updatedA
            if (a.id === agentBId) return updatedB
            return a
          })
        )
      } catch {
        // Rollback
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id === agentAId) return { ...a, collaboratorIds: aCollabs }
            if (a.id === agentBId) return { ...a, collaboratorIds: bCollabs }
            return a
          })
        )
      }
    },
    [agents]
  )

  const handleTaskCreated = useCallback((task: TaskData) => {
    setTasks((prev) => [task, ...prev])
  }, [])

  const showPanel = selectedNode !== null || selectedTaskId !== null

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="outline" size="sm" onClick={handleCreateDepartment}>
          <Building2Icon className="mr-1 h-3.5 w-3.5" />
          Department
        </Button>
        <Button variant="outline" size="sm" onClick={handleCreateAgent}>
          <BotIcon className="mr-1 h-3.5 w-3.5" />
          Agent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMcpDialogOpen(true)}
        >
          <PlugIcon className="mr-1 h-3.5 w-3.5" />
          MCP
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setDispatchOpen(true)}>
          <SendIcon className="mr-1 h-3.5 w-3.5" />
          Dispatch Task
        </Button>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        <div className={showPanel ? 'flex-1' : 'w-full'}>
          <ReactFlowProvider>
            <OrgGraph
              departments={departments}
              agents={agents}
              fitViewVersion={fitViewVersion}
              onUpdateDepartment={handleUpdateDepartment}
              onUpdateAgent={handleUpdateAgent}
              onAssignDepartment={handleAssignDepartment}
              onUnassignDepartment={handleUnassignDepartment}
              onAddCollaboration={handleAddCollaboration}
              onRemoveCollaboration={handleRemoveCollaboration}
            />
          </ReactFlowProvider>
        </div>

        {showPanel && (
          <div className="w-[380px] shrink-0 overflow-y-auto border-l">
            {selectedTaskId ? (
              <ExecutionTimeline
                taskId={selectedTaskId}
                events={events.filter(
                  (e) => 'taskId' in e && e.taskId === selectedTaskId
                )}
                onClose={() => setSelectedTaskId(null)}
              />
            ) : selectedNode?.type === 'department' ? (
              (() => {
                const dept = departments.find((d) => d.id === selectedNode.id)
                return dept ? (
                  <DepartmentConfigPanel
                    department={dept}
                    onUpdate={handleUpdateDepartment}
                    onDelete={handleDeleteDepartment}
                    onClose={() => setSelectedNode(null)}
                  />
                ) : null
              })()
            ) : selectedNode?.type === 'agent' ? (
              (() => {
                const agent = agents.find((a) => a.id === selectedNode.id)
                return agent ? (
                  <AgentConfigPanel
                    agent={agent}
                    onUpdate={handleUpdateAgent}
                    onDelete={handleDeleteAgent}
                    onClose={() => setSelectedNode(null)}
                  />
                ) : null
              })()
            ) : null}
          </div>
        )}
      </div>

      <TaskList
        tasks={tasks}
        agents={agents}
        events={events}
        onSelectTask={setSelectedTaskId}
      />

      <TaskDispatchDialog
        departments={departments}
        agents={agents}
        onTaskCreated={handleTaskCreated}
      />
      <McpManagerDialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen} />
    </div>
  )
}
