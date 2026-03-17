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
import { UseFormReturnType } from '@shared/schemas/setting-schema'
import {
  BrainIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'
import {
  createMemory,
  deleteMemory,
  getMemories,
  updateMemory,
  type MemoryItem,
  type MemorySource,
  type MemoryType
} from '../../../services/memory'
import { SettingRow, SettingSection } from '../setting-row'
import { SettingSelect } from '../setting-select'

const MEMORY_TYPES: MemoryType[] = [
  'preference',
  'goal',
  'environment',
  'skill',
  'project',
  'constraint'
]

const TYPE_COLORS: Record<MemoryType, string> = {
  preference:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  goal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  environment:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  skill:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  project:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  constraint: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
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
  const [type, setType] = useState<MemoryType>(memory?.type ?? 'preference')
  const [key, setKey] = useState(memory?.key ?? '')
  const [valueText, setValueText] = useState(
    memory?.value?.text ? String(memory.value.text) : ''
  )
  const [confidence, setConfidence] = useState(
    memory?.confidence != null ? String(memory.confidence) : '0.8'
  )
  const [source, setSource] = useState<MemorySource>(memory?.source ?? 'system')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (memory) {
      setType(memory.type)
      setKey(memory.key)
      setValueText(memory.value?.text ? String(memory.value.text) : '')
      setConfidence(
        memory.confidence != null ? String(memory.confidence) : '0.8'
      )
      setSource(memory.source)
    } else {
      setType('preference')
      setKey('')
      setValueText('')
      setConfidence('0.8')
      setSource('system')
    }
  }, [memory, open])

  const handleSave = async () => {
    if (!key.trim() || !valueText.trim()) {
      toast.error('Key and value are required')
      return
    }
    setSaving(true)
    try {
      const conf = parseFloat(confidence)
      const value = { text: valueText.trim() }
      if (isEdit && memory) {
        await updateMemory(memory.id, {
          type,
          key: key.trim(),
          value,
          confidence: conf,
          source
        })
        toast.success('Memory updated')
      } else {
        await createMemory({
          type,
          key: key.trim(),
          value,
          confidence: conf,
          source
        })
        toast.success('Memory created')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save memory')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Memory' : 'Add Memory'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <SettingSelect
                value={type}
                onValueChange={(v) => setType(v as MemoryType)}
                options={MEMORY_TYPES.map((t) => ({
                  value: t,
                  label: t.charAt(0).toUpperCase() + t.slice(1)
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <SettingSelect
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
            <Label>Key</Label>
            <Input
              placeholder="e.g. preferred_language"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Value</Label>
            <Textarea
              placeholder="The memory content..."
              rows={3}
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
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
  const valueText = item.value?.text
    ? String(item.value.text)
    : JSON.stringify(item.value)

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition-opacity ${
        item.isActive === false ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type]}`}
          >
            {item.type}
          </span>
          <span className="truncate text-sm font-medium">{item.key}</span>
          {item.confidence != null && (
            <span className="text-muted-foreground ml-auto text-xs">
              {Math.round(item.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {valueText}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={item.isActive === false ? 'Restore' : 'Disable'}
          onClick={() => onToggle(item)}
        >
          <EyeOffIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Edit"
          onClick={() => onEdit(item)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-7 w-7"
          title="Delete"
          onClick={() => onDelete(item)}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MemoryLayer({ form }: { form: UseFormReturnType }) {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MemoryItem | null>(null)

  const lcmEnabled = form.watch('memoryLayer.lcmEnabled') ?? true

  const loadMemories = useCallback(async () => {
    try {
      const data = await getMemories()
      setMemories(data)
    } catch {
      toast.error('Failed to load memories')
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
    } catch {
      toast.error('Failed to update memory')
    }
  }

  const handleDelete = async (item: MemoryItem) => {
    try {
      await deleteMemory(item.id)
      await loadMemories()
      toast.success('Memory deleted')
    } catch {
      toast.error('Failed to delete memory')
    }
  }

  const activeMemories = memories.filter((m) => m.isActive !== false)
  const inactiveMemories = memories.filter((m) => m.isActive === false)

  return (
    <>
      <SettingSection>
        {/* ── Memory Auto-Write ── */}
        <SettingRow
          label="Auto-write memories"
          description="After each conversation, automatically extract and save long-term facts (preferences, goals, skills) into your memory."
        >
          <Controller
            control={form.control}
            name="memoryLayer.autoWrite"
            render={({ field }) => (
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </SettingRow>

        {/* ── LCM Settings ── */}
        <SettingRow
          label="Lossless context management"
          description="Automatically compress long conversations into a hierarchical summary DAG, so nothing is ever lost even when chats exceed the context window."
        >
          <Controller
            control={form.control}
            name="memoryLayer.lcmEnabled"
            render={({ field }) => (
              <Switch
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </SettingRow>

        {lcmEnabled && (
          <>
            <Controller
              control={form.control}
              name="memoryLayer.contextWindowPercent"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Compaction threshold"
                  description="Trigger context compaction when the conversation reaches this percentage of the model's context window (50-95%). Default: 75%."
                  error={fieldState.error}
                >
                  <Input
                    type="number"
                    min={50}
                    max={95}
                    className="w-20"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingRow>
              )}
            />

            <Controller
              control={form.control}
              name="memoryLayer.freshTailSize"
              render={({ field, fieldState }) => (
                <SettingRow
                  label="Fresh tail size"
                  description="Number of recent messages protected from compaction (8-64). These are always sent to the model verbatim. Default: 16."
                  error={fieldState.error}
                >
                  <Input
                    type="number"
                    min={8}
                    max={64}
                    className="w-20"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingRow>
              )}
            />
          </>
        )}

        {/* ── Memory Management ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              Stored memories
              {activeMemories.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeMemories.length}
                </Badge>
              )}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <PlusIcon className="mr-1 h-3.5 w-3.5" />
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
            No memories yet. They'll be added automatically after conversations,
            or you can add them manually.
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
      </SettingSection>

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
