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
import { useAtom } from 'jotai'
import { PlugIcon, PlusIcon, SendIcon } from 'lucide-react'
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
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load data
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

  // Global SSE connection
  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/api/agent-x/sse`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentXSseEvent
        setEvents((prev) => [...prev.slice(-200), event])

        // Refresh tasks on status changes
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

  // CRUD handlers
  const handleCreateDepartment = useCallback(async () => {
    const dept = await createDepartment({
      name: 'New Department',
      description: '',
      position: { x: 100 + departments.length * 300, y: 100 }
    })
    setDepartments((prev) => [...prev, dept])
  }, [departments.length])

  const handleUpdateDepartment = useCallback(
    async (id: string, data: Partial<DepartmentData>) => {
      const updated = await updateDepartment(id, data)
      setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)))
    },
    []
  )

  const handleDeleteDepartment = useCallback(async (id: string) => {
    await deleteDepartment(id)
    setDepartments((prev) => prev.filter((d) => d.id !== id))
    setAgents((prev) => prev.filter((a) => a.departmentId !== id))
  }, [])

  const handleCreateAgent = useCallback(
    async (departmentId: string) => {
      const dept = departments.find((d) => d.id === departmentId)
      const deptAgents = agents.filter((a) => a.departmentId === departmentId)
      const ag = await createAgentApi({
        departmentId,
        name: 'New Agent',
        description: '',
        position: {
          x: (dept?.position?.x ?? 100) + 50,
          y: (dept?.position?.y ?? 100) + 150 + deptAgents.length * 100
        }
      })
      setAgents((prev) => [...prev, ag])
    },
    [departments, agents]
  )

  const handleUpdateAgent = useCallback(
    async (id: string, data: Partial<AgentData>) => {
      const updated = await updateAgentApi(id, data)
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)))
    },
    []
  )

  const handleDeleteAgent = useCallback(async (id: string) => {
    await deleteAgentApi(id)
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleTaskCreated = useCallback((task: TaskData) => {
    setTasks((prev) => [task, ...prev])
  }, [])

  // Determine right panel content
  const showPanel = selectedNode !== null || selectedTaskId !== null

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="outline" size="sm" onClick={handleCreateDepartment}>
          <PlusIcon className="mr-1 h-3.5 w-3.5" />
          Department
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
        {/* Graph */}
        <div className={showPanel ? 'flex-1' : 'w-full'}>
          <OrgGraph
            departments={departments}
            agents={agents}
            onCreateAgent={handleCreateAgent}
            onUpdateDepartment={handleUpdateDepartment}
            onUpdateAgent={handleUpdateAgent}
          />
        </div>

        {/* Right panel */}
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
              <DepartmentConfigPanel
                department={departments.find((d) => d.id === selectedNode.id)!}
                onUpdate={handleUpdateDepartment}
                onDelete={handleDeleteDepartment}
                onClose={() => setSelectedNode(null)}
              />
            ) : selectedNode?.type === 'agent' ? (
              <AgentConfigPanel
                agent={agents.find((a) => a.id === selectedNode.id)!}
                onUpdate={handleUpdateAgent}
                onDelete={handleDeleteAgent}
                onClose={() => setSelectedNode(null)}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom task list */}
      <TaskList
        tasks={tasks}
        agents={agents}
        events={events}
        onSelectTask={setSelectedTaskId}
      />

      {/* Dialogs */}
      <TaskDispatchDialog
        departments={departments}
        agents={agents}
        onTaskCreated={handleTaskCreated}
      />
      <McpManagerDialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen} />
    </div>
  )
}
