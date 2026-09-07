import { UseFormReturnType } from '@shared/schemas/settings-schema'
import {
  BrainIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'

import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  createMemory,
  deleteMemory,
  getMemories,
  updateMemory,
  type MemoryItem,
  type MemorySection,
  type MemorySource
} from '../../../services/memory'
import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const MEMORY_SECTIONS: MemorySection[] = ['profile', 'topic', 'person']

const SECTION_VARIANTS: Record<
  MemorySection,
  'default' | 'secondary' | 'outline'
> = {
  profile: 'default',
  topic: 'secondary',
  person: 'outline'
}

// ─── Memory Edit Dialog ───────────────────────────────────────────────────────

interface MemoryDialogProps {
  open: boolean
  onClose: () => void
  memory?: MemoryItem | null
  onSaved: () => void
}

function MemoryDialog({ open, onClose, memory, onSaved }: MemoryDialogProps) {
  const isEdit = !!memory
  const [section, setSection] = useState<MemorySection>('topic')
  const [key, setKey] = useState('')
  const [summary, setSummary] = useState('')
  const [detailsText, setDetailsText] = useState('')
  const [confidence, setConfidence] = useState('0.8')
  const [source, setSource] = useState<MemorySource>('system')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSection(memory?.section ?? 'topic')
    setKey(memory?.key ?? '')
    setSummary(memory?.summary ?? '')
    setDetailsText((memory?.details ?? []).join('\n'))
    setConfidence(
      memory?.confidence != null ? String(memory.confidence) : '0.8'
    )
    setSource(memory?.source ?? 'system')
  }, [memory, open])

  const handleSave = async () => {
    if (!key.trim() || !summary.trim()) {
      sileo.error({ title: 'Key and summary are required' })
      return
    }
    setSaving(true)
    try {
      const details = detailsText
        .split('\n')
        .map((d) => d.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
      const fields = {
        section,
        key: key.trim(),
        summary: summary.trim(),
        details,
        confidence: parseFloat(confidence)
      }
      if (isEdit && memory) {
        await updateMemory(memory.id, { ...fields, source })
        sileo.success({ title: 'Memory updated' })
      } else {
        await createMemory({ ...fields, source })
        sileo.success({ title: 'Memory created' })
      }
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Operation failed'
      sileo.error({ title: 'Failed to save memory', description: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit memory' : 'Add memory'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Section</Label>
              <SettingsSelect
                value={section}
                onValueChange={(v) => setSection(v as MemorySection)}
                options={MEMORY_SECTIONS.map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1)
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <SettingsSelect
                value={source}
                onValueChange={(v) => setSource(v as MemorySource)}
                options={[
                  { value: 'explicit', label: 'Explicit' },
                  { value: 'implicit', label: 'Implicit' },
                  { value: 'system', label: 'System' }
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Classical Music"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Summary</Label>
            <Input
              placeholder="One sentence"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Details</Label>
            <Textarea
              placeholder={'One bullet per line'}
              rows={4}
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Confidence (0-1)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Memory List Item ─────────────────────────────────────────────────────────

function MemoryListItem({
  item,
  onEdit,
  onToggle,
  onDelete
}: {
  item: MemoryItem
  onEdit: (item: MemoryItem) => void
  onToggle: (item: MemoryItem) => void
  onDelete: (item: MemoryItem) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border p-3 transition-opacity',
        item.isActive === false && 'opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={SECTION_VARIANTS[item.section]}>{item.section}</Badge>
          <span className="truncate text-sm font-medium">{item.key}</span>
          {item.confidence != null && (
            <span className="text-muted-foreground ml-auto text-xs">
              {Math.round(item.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-xs">{item.summary}</p>
        {item.details.length > 0 && (
          <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
            {item.details.slice(0, 5).map((d, i) => (
              <li key={i} className="truncate">
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title={item.isActive === false ? 'Restore' : 'Disable'}
          onClick={() => onToggle(item)}
        >
          <EyeOffIcon className="size-3.5" data-icon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Edit"
          onClick={() => onEdit(item)}
        >
          <PencilIcon className="size-3.5" data-icon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-7"
          title="Delete"
          onClick={() => onDelete(item)}
        >
          <Trash2Icon className="size-3.5" data-icon />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MemorySettings({ form }: { form: UseFormReturnType }) {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MemoryItem | null>(null)

  const lcmEnabled = form.watch('memory.lcmEnabled') ?? true

  const loadMemories = useCallback(async () => {
    try {
      const data = await getMemories()
      setMemories(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Operation failed'
      sileo.error({ title: 'Failed to load memories', description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const handleEdit = (item: MemoryItem) => {
    setEditTarget(item)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const handleToggle = async (item: MemoryItem) => {
    try {
      await updateMemory(item.id, { isActive: !item.isActive })
      await loadMemories()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Operation failed'
      sileo.error({ title: 'Failed to update memory', description: msg })
    }
  }

  const handleDelete = async (item: MemoryItem) => {
    try {
      await deleteMemory(item.id)
      await loadMemories()
      sileo.success({ title: 'Memory deleted' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Operation failed'
      sileo.error({ title: 'Failed to delete memory', description: msg })
    }
  }

  const activeMemories = memories.filter((m) => m.isActive !== false)
  const inactiveMemories = memories.filter((m) => m.isActive === false)

  return (
    <>
      <SettingsSection>
        <SettingsRow
          label="Capture memories"
          description="After each conversation, consolidate durable facts about you (interests, setup, people) into memory — updating existing entries rather than duplicating them."
        >
          <Controller
            control={form.control}
            name="memory.autoCapture"
            render={({ field }) => (
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Use memory in chats"
          description="Surface the memory entries relevant to your message into the assistant's context at the start of a reply."
        >
          <Controller
            control={form.control}
            name="memory.useInChat"
            render={({ field }) => (
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Lossless context management"
          description="Automatically compress long conversations into a hierarchical summary DAG, so nothing is ever lost even when chats exceed the context window."
        >
          <Controller
            control={form.control}
            name="memory.lcmEnabled"
            render={({ field }) => (
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </SettingsRow>

        {lcmEnabled && (
          <>
            <Controller
              control={form.control}
              name="memory.contextWindowPercent"
              render={({ field, fieldState }) => (
                <SettingsRow
                  label="Compaction threshold"
                  description="Trigger context compaction when the conversation reaches this percentage of the model's context window (50-95%). Default: 75%."
                  error={fieldState.error}
                >
                  <Input
                    placeholder="75"
                    type="number"
                    min={50}
                    max={95}
                    className="w-20"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingsRow>
              )}
            />

            <Controller
              control={form.control}
              name="memory.freshTailSize"
              render={({ field, fieldState }) => (
                <SettingsRow
                  label="Fresh tail size"
                  description="Number of recent messages protected from compaction (8-64). These are always sent to the model verbatim. Default: 16."
                  error={fieldState.error}
                >
                  <Input
                    placeholder="16"
                    type="number"
                    min={8}
                    max={64}
                    className="w-20"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingsRow>
              )}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Stored memories" plain>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">
              Memories
              {activeMemories.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeMemories.length}
                </Badge>
              )}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <PlusIcon className="mr-1 size-3.5" data-icon />
            Add
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
            No memories yet. They&apos;ll be added automatically after
            conversations, or you can add them manually.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeMemories.map((item) => (
              <MemoryListItem
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}

            {inactiveMemories.length > 0 && (
              <>
                <p className="text-muted-foreground mt-1 text-xs">
                  Disabled ({inactiveMemories.length})
                </p>
                {inactiveMemories.map((item) => (
                  <MemoryListItem
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </SettingsSection>

      <MemoryDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditTarget(null)
        }}
        memory={editTarget}
        onSaved={loadMemories}
      />
    </>
  )
}
