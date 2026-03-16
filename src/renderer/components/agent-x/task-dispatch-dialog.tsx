import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { autoRoute, createTaskApi } from '@/services/agent-x'
import {
  type AgentData,
  type DepartmentData,
  type TaskData,
  isTaskDispatchDialogOpenAtom
} from '@/stores/agent-x'
import type { AutoRouteResult } from '@shared/types/agent-x'
import { useAtom } from 'jotai'
import { Loader2Icon, SparklesIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

interface TaskDispatchDialogProps {
  departments: DepartmentData[]
  agents: AgentData[]
  onTaskCreated: (task: TaskData) => void
}

export function TaskDispatchDialog({
  departments,
  agents,
  onTaskCreated
}: TaskDispatchDialogProps) {
  const [open, setOpen] = useAtom(isTaskDispatchDialogOpenAtom)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [priority, setPriority] = useState('medium')
  const [routing, setRouting] = useState(false)
  const [routeResult, setRouteResult] = useState<AutoRouteResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleAutoRoute = useCallback(async () => {
    if (!description && !title) return
    setRouting(true)
    try {
      const result = await autoRoute(description || title)
      setRouteResult(result)
      if (result?.agentId) {
        setSelectedAgentId(result.agentId)
      }
    } catch (err) {
      console.error('Auto-route failed:', err)
    } finally {
      setRouting(false)
    }
  }, [title, description])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const agentRecord = agents.find((a) => a.id === selectedAgentId)
      const task = await createTaskApi({
        title,
        description,
        priority,
        assignedAgentId: selectedAgentId || null,
        assignedDepartmentId: agentRecord?.departmentId ?? null
      })
      onTaskCreated(task)
      // Reset form
      setTitle('')
      setDescription('')
      setSelectedAgentId('')
      setRouteResult(null)
      setOpen(false)
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setSubmitting(false)
    }
  }, [
    title,
    description,
    priority,
    selectedAgentId,
    agents,
    onTaskCreated,
    setOpen
  ])

  const activeAgents = agents.filter((a) => a.isActive)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispatch Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Write a blog post about AI trends"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detailed instructions for the agent..."
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Assign Agent</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoRoute}
                disabled={routing || (!title && !description)}
              >
                {routing ? (
                  <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SparklesIcon className="mr-1 h-3.5 w-3.5" />
                )}
                Auto-Route
              </Button>
            </div>

            {routeResult && (
              <div className="bg-muted rounded-md p-2 text-xs">
                <span className="font-medium">
                  {agents.find((a) => a.id === routeResult.agentId)?.name ??
                    'Unknown'}
                </span>{' '}
                ({Math.round(routeResult.confidence * 100)}%) —{' '}
                {routeResult.reasoning}
              </div>
            )}

            <Select
              value={selectedAgentId}
              onValueChange={(v) => setSelectedAgentId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map((ag) => {
                  const dept = departments.find((d) => d.id === ag.departmentId)
                  return (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name}
                      {dept ? ` (${dept.name})` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v ?? 'medium')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedAgentId || submitting}
          >
            {submitting ? (
              <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
