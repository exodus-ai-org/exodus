import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { autoFill, createTaskApi } from '@/services/agent-x'
import {
  type AgentData,
  type DepartmentData,
  type TaskData,
  isTaskDispatchDialogOpenAtom
} from '@/stores/agent-x'
import { useAtom } from 'jotai'
import {
  CalendarClockIcon,
  Loader2Icon,
  SparklesIcon,
  ZapIcon
} from 'lucide-react'
import { useCallback, useState } from 'react'

// ─── Cron presets ────────────────────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Custom…', value: 'custom' }
]

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
  const [filling, setFilling] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Schedule
  const [mode, setMode] = useState<'once' | 'cron'>('once')
  const [cronPreset, setCronPreset] = useState<string>('')
  const [cronCustom, setCronCustom] = useState('')

  const cronExpression =
    mode === 'cron'
      ? cronPreset === 'custom'
        ? cronCustom.trim()
        : cronPreset
      : null

  const handleAutoFill = useCallback(async () => {
    if (!title.trim()) return
    setFilling(true)
    try {
      const result = await autoFill(title)
      if (!result) return
      setDescription(result.description)
      setMode(result.mode)
      if (result.mode === 'cron' && result.cronExpression) {
        const preset = CRON_PRESETS.find(
          (p) => p.value === result.cronExpression
        )
        if (preset) {
          setCronPreset(preset.value)
        } else {
          setCronPreset('custom')
          setCronCustom(result.cronExpression)
        }
      }
      if (result.agentId) setSelectedAgentId(result.agentId)
      setPriority(result.priority)
    } catch (err) {
      console.error('Auto-fill failed:', err)
    } finally {
      setFilling(false)
    }
  }, [title])

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
        assignedDepartmentId: agentRecord?.departmentId ?? null,
        cronExpression: cronExpression || null
      })
      onTaskCreated(task)
      // Reset
      setTitle('')
      setDescription('')
      setSelectedAgentId('')
      setPriority('medium')
      setMode('once')
      setCronPreset('')
      setCronCustom('')
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
    cronExpression,
    agents,
    onTaskCreated,
    setOpen
  ])

  const activeAgents = agents.filter((a) => a.isActive && !a.isShadow)
  const canSubmit = title.trim() && (mode === 'once' || !!cronExpression)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Dispatch Task</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          {/* Title + Smart Fill */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <div className="flex gap-2">
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarise today's Japan portfolio performance"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoFill}
                disabled={filling || !title.trim()}
                className="shrink-0"
              >
                {filling ? (
                  <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SparklesIcon className="mr-1 h-3.5 w-3.5" />
                )}
                Smart Fill
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detailed instructions for the agent..."
            />
          </div>

          {/* Schedule mode toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>Schedule</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('once')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                  mode === 'once'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                <ZapIcon className="h-3.5 w-3.5" />
                One-time
              </button>
              <button
                type="button"
                onClick={() => setMode('cron')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                  mode === 'cron'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                <CalendarClockIcon className="h-3.5 w-3.5" />
                Scheduled
              </button>
            </div>

            {/* Cron config */}
            {mode === 'cron' && (
              <div className="mt-1 flex flex-col gap-2">
                <Select
                  value={cronPreset}
                  onValueChange={(v) => setCronPreset(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a schedule…" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectGroup>
                      {CRON_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {cronPreset === 'custom' && (
                  <Input
                    value={cronCustom}
                    onChange={(e) => setCronCustom(e.target.value)}
                    placeholder="e.g.  0 8 * * 1-5  (weekdays at 8 AM)"
                    className="font-mono text-xs"
                  />
                )}
                {cronExpression && cronPreset !== 'custom' && (
                  <p className="text-muted-foreground font-mono text-xs">
                    {cronExpression}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Agent assignment */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Assign Agent{' '}
              <span className="text-muted-foreground text-xs font-normal">
                (optional — auto-routed if empty)
              </span>
            </Label>
            <Select
              value={selectedAgentId}
              onValueChange={(v) => setSelectedAgentId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Leave blank for smart dispatch…" />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectGroup>
                  {activeAgents.map((ag) => {
                    const dept = departments.find(
                      (d) => d.id === ag.departmentId
                    )
                    return (
                      <SelectItem key={ag.id} value={ag.id}>
                        {ag.name}
                        {dept ? ` (${dept.name})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            {mode === 'once' && (
              <span className="text-muted-foreground text-xs font-normal">
                High/Urgent creates a shadow agent if the target is busy
              </span>
            )}
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v ?? 'medium')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectGroup>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && (
              <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
            )}
            {mode === 'cron' ? 'Schedule' : 'Dispatch'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
