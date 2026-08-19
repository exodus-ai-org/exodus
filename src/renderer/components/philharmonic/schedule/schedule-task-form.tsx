import { useState } from 'react'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createScheduledTask } from '@/services/philharmonic-tasks'
import type { ConversationData, TaskData } from '@/stores/philharmonic'

const CRON_PRESETS = [
  { label: 'Every day at 9:00 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1' },
  { label: 'Custom', value: 'custom' }
]

export function ScheduleTaskForm({
  open,
  onOpenChange,
  conversations,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: ConversationData[]
  onCreated: (task: TaskData) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [mode, setMode] = useState<'once' | 'recurring'>('once')
  const [runAtDate, setRunAtDate] = useState<Date | undefined>(undefined)
  const [runAtTime, setRunAtTime] = useState('09:00')
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[0].value)
  const [customCron, setCustomCron] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setTitle('')
    setDescription('')
    setConversationId('')
    setMode('once')
    setRunAtDate(undefined)
    setRunAtTime('09:00')
    setCronPreset(CRON_PRESETS[0].value)
    setCustomCron('')
  }

  const handleSubmit = async () => {
    if (!title.trim() || !conversationId) return
    let cronExpression: string | null = null
    let runAt: string | null = null
    if (mode === 'recurring') {
      cronExpression = cronPreset === 'custom' ? customCron.trim() : cronPreset
      if (!cronExpression) return
    } else {
      if (!runAtDate) return
      const [hours, minutes] = runAtTime.split(':').map(Number)
      const combined = new Date(runAtDate)
      combined.setHours(hours, minutes, 0, 0)
      runAt = combined.toISOString()
    }
    setSubmitting(true)
    try {
      const task = await createScheduledTask({
        title: title.trim(),
        description: description.trim() || undefined,
        conversationId,
        cronExpression,
        runAt
      })
      onCreated(task)
      reset()
      onOpenChange(false)
      sileo.success({ title: 'Task scheduled' })
    } catch (err) {
      sileo.error({
        title: 'Could not schedule task',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Schedule a task</SheetTitle>
          <SheetDescription>
            Runs inside an existing Group, once or on a recurring schedule.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-title">Title</Label>
            <Input
              id="schedule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly status report"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-description">Description</Label>
            <Textarea
              id="schedule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should the team do?"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Group</Label>
            <Select
              value={conversationId}
              onValueChange={(v) => v && setConversationId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                {conversations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'once' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('once')}
            >
              One-off
            </Button>
            <Button
              type="button"
              variant={mode === 'recurring' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('recurring')}
            >
              Recurring
            </Button>
          </div>
          {mode === 'once' ? (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    {runAtDate ? runAtDate.toDateString() : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={runAtDate}
                    onSelect={setRunAtDate}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={runAtTime}
                onChange={(e) => setRunAtTime(e.target.value)}
                className="w-28"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Select
                value={cronPreset}
                onValueChange={(v) => v && setCronPreset(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cronPreset === 'custom' && (
                <Input
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 9 * * 1-5"
                />
              )}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button
            type="button"
            disabled={submitting || !title.trim() || !conversationId}
            onClick={handleSubmit}
          >
            {submitting ? 'Scheduling…' : 'Schedule task'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
