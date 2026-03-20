import { AgentConfigPanel } from '@/components/agent-x/agent-config-panel'
import { CostAnalysis } from '@/components/agent-x/cost-analysis'
import { ChartAreaInteractive } from '@/components/agent-x/dashboard/chart-area-interactive'
import { SectionCards } from '@/components/agent-x/dashboard/section-cards'
import { DepartmentConfigPanel } from '@/components/agent-x/department-config-panel'
import { ExecutionTimeline } from '@/components/agent-x/execution-timeline'
import { OrgGraph } from '@/components/agent-x/org-graph'
import { TaskDispatchDialog } from '@/components/agent-x/task-dispatch-dialog'
import { TaskKanban } from '@/components/agent-x/task-kanban'
import { TaskList } from '@/components/agent-x/task-list'
import { TaskLogSheet } from '@/components/agent-x/task-log-sheet'
import { Button } from '@/components/ui/button'
import type { AgentXPage } from '@/layouts/agent-x-layout'
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
import { Plus, SendIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface AgentXContainerProps {
  activePage: AgentXPage
  onNavigate?: (page: AgentXPage) => void
}

export function AgentXContainer({ activePage }: AgentXContainerProps) {
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [agents, setAgents] = useState<AgentData[]>([])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [events, setEvents] = useState<AgentXSseEvent[]>([])
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const [, setDispatchOpen] = useAtom(isTaskDispatchDialogOpenAtom)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [logTaskId, setLogTaskId] = useState<string | null>(null)
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
        // ignore
      }
    }
    return () => es.close()
  }, [])

  // ─── Metrics ─────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const completedTasks = tasks.filter((t) => t.status === 'completed').length
    const failedTasks = tasks.filter((t) => t.status === 'failed').length
    const runningTasks = tasks.filter((t) => t.status === 'running').length
    const activeAgents = agents.filter((a) => a.isActive !== false).length
    return {
      totalTasks: tasks.length,
      activeDepartments: departments.length,
      activeAgents,
      runningTasks,
      completedTasks,
      failedTasks
    }
  }, [tasks, agents, departments])

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
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, departmentId } : a))
      )
      try {
        const updated = await updateAgentApi(agentId, { departmentId })
        setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
      } catch {
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, departmentId: null } : a))
        )
      }
    },
    []
  )

  const handleUnassignDepartment = useCallback(
    async (agentId: string) => {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, departmentId: null } : a))
      )
      try {
        const updated = await updateAgentApi(agentId, { departmentId: null })
        setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
      } catch {
        loadData()
      }
    },
    [loadData]
  )

  // ─── Collaboration handlers ─────────────────────────────────────────────

  const handleAddCollaboration = useCallback(
    async (agentAId: string, agentBId: string) => {
      const agentA = agents.find((a) => a.id === agentAId)
      const agentB = agents.find((a) => a.id === agentBId)
      if (!agentA || !agentB) return
      const aCollabs = agentA.collaboratorIds ?? []
      if (aCollabs.includes(agentBId)) return
      const bCollabs = agentB.collaboratorIds ?? []
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
          updateAgentApi(agentBId, {
            collaboratorIds: [...bCollabs, agentAId]
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

  // ─── Bulk handlers ───────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(
    async (deptIds: string[], agentIds: string[]) => {
      await Promise.all([
        ...deptIds.map((id) => deleteDepartment(id)),
        ...agentIds.map((id) => deleteAgentApi(id))
      ])
      setDepartments((prev) => prev.filter((d) => !deptIds.includes(d.id)))
      setAgents((prev) => {
        const remaining = prev.filter((a) => !agentIds.includes(a.id))
        return remaining.map((a) =>
          a.departmentId && deptIds.includes(a.departmentId)
            ? { ...a, departmentId: null }
            : a
        )
      })
      setSelectedNode((cur) => {
        if (!cur) return cur
        if (deptIds.includes(cur.id) || agentIds.includes(cur.id)) return null
        return cur
      })
      bumpFitView()
    },
    [setSelectedNode, bumpFitView]
  )

  const handleBulkDuplicate = useCallback(
    async (deptIds: string[], agentIds: string[]) => {
      const srcDepts = deptIds
        .map((id) => departments.find((d) => d.id === id))
        .filter(Boolean) as DepartmentData[]
      const srcAgents = agentIds
        .map((id) => agents.find((a) => a.id === id))
        .filter(Boolean) as AgentData[]

      // Compute shift so copies land to the right of all existing nodes
      const allPositions = [...departments, ...agents].map(
        (n) => n.position ?? { x: 0, y: 0 }
      )
      const maxExistingX =
        allPositions.length > 0
          ? Math.max(...allPositions.map((p) => p.x)) + 200
          : 200
      const srcPositions = [
        ...srcDepts.map((d) => d.position ?? { x: 0, y: 0 }),
        ...srcAgents.map((a) => a.position ?? { x: 0, y: 0 })
      ]
      const minSrcX =
        srcPositions.length > 0 ? Math.min(...srcPositions.map((p) => p.x)) : 0
      const shiftX = maxExistingX - minSrcX + 60
      const shiftY = 60

      // Create new departments first
      const newDepts = await Promise.all(
        srcDepts.map((src) =>
          createDepartment({
            name: `${src.name} (copy)`,
            description: src.description,
            position: {
              x: (src.position?.x ?? 0) + shiftX,
              y: (src.position?.y ?? 0) + shiftY
            }
          })
        )
      )

      // Build old→new dept ID mapping so agents get remapped correctly
      const deptIdMap = new Map<string, string>()
      srcDepts.forEach((src, i) => {
        const nd = newDepts[i]
        if (nd) deptIdMap.set(src.id, nd.id)
      })

      // Create agents, remapping departmentId to new dept if it was also copied
      const newAgents = await Promise.all(
        srcAgents.map((src) => {
          const newDeptId = src.departmentId
            ? (deptIdMap.get(src.departmentId) ?? src.departmentId)
            : src.departmentId
          return createAgentApi({
            name: `${src.name} (copy)`,
            description: src.description,
            systemPrompt: src.systemPrompt,
            toolAllowList: src.toolAllowList,
            isActive: src.isActive,
            departmentId: newDeptId,
            position: {
              x: (src.position?.x ?? 0) + shiftX,
              y: (src.position?.y ?? 0) + shiftY
            }
          })
        })
      )

      setDepartments((prev) => [
        ...prev,
        ...(newDepts.filter(Boolean) as DepartmentData[])
      ])
      setAgents((prev) => [
        ...prev,
        ...(newAgents.filter(Boolean) as AgentData[])
      ])
      bumpFitView()
    },
    [departments, agents, bumpFitView]
  )

  const showTimeline = selectedTaskId !== null

  const selectedDept =
    selectedNode?.type === 'department'
      ? (departments.find((d) => d.id === selectedNode.id) ?? null)
      : null
  const selectedAgent =
    selectedNode?.type === 'agent'
      ? (agents.find((a) => a.id === selectedNode.id) ?? null)
      : null

  // ─── Page content ─────────────────────────────────────────────────────────

  return (
    <>
      {activePage === 'dashboard' && (
        <div className="flex flex-1 flex-col gap-4 py-4">
          <SectionCards {...metrics} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive tasks={tasks} />
          </div>
          <div className="px-4 lg:px-6">
            <TaskList
              tasks={tasks}
              agents={agents}
              events={events}
              onSelectTask={setLogTaskId}
            />
          </div>
        </div>
      )}

      {activePage === 'org-editor' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateDepartment}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Department
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateAgent}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Agent
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setDispatchOpen(true)}>
              <SendIcon className="mr-1 h-3.5 w-3.5" />
              Dispatch Task
            </Button>
          </div>

          {/* Graph + Timeline */}
          <div className="flex min-h-0 flex-1">
            <div className={showTimeline ? 'flex-1' : 'w-full'}>
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
                  onBulkDelete={handleBulkDelete}
                  onBulkDuplicate={handleBulkDuplicate}
                />
              </ReactFlowProvider>
            </div>

            {showTimeline && (
              <div className="w-[380px] shrink-0 overflow-y-auto border-l">
                <ExecutionTimeline
                  taskId={selectedTaskId}
                  events={events.filter(
                    (e) => 'taskId' in e && e.taskId === selectedTaskId
                  )}
                  onClose={() => setSelectedTaskId(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activePage === 'archive' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
          <TaskKanban
            tasks={tasks}
            agents={agents}
            departments={departments}
            onSelectTask={setLogTaskId}
            onTaskUpdate={(updated) =>
              setTasks((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              )
            }
          />
        </div>
      )}

      {activePage === 'costs' && <CostAnalysis />}

      {/* Task log sheet */}
      <TaskLogSheet
        taskId={logTaskId}
        agents={agents}
        onClose={() => setLogTaskId(null)}
      />

      {/* Sheets (always mounted) */}
      <TaskDispatchDialog
        departments={departments}
        agents={agents}
        onTaskCreated={handleTaskCreated}
      />
      <DepartmentConfigPanel
        department={selectedDept}
        open={selectedDept !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNode(null)
        }}
        onUpdate={handleUpdateDepartment}
        onDelete={handleDeleteDepartment}
      />
      <AgentConfigPanel
        agent={selectedAgent}
        open={selectedAgent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNode(null)
        }}
        onUpdate={handleUpdateAgent}
        onDelete={handleDeleteAgent}
      />
    </>
  )
}
