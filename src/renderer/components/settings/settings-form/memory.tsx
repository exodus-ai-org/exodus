import { UseFormReturnType } from '@shared/schemas/settings-schema'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  createMemory,
  deleteMemory,
  getMemories,
  instructMemory,
  updateMemory,
  type MemoryItem,
  type MemorySection
} from '../../../services/memory'
import { SettingsRow, SettingsSection } from '../settings-row'

const SECTION_GROUPS: { section: MemorySection; label: string }[] = [
  { section: 'profile', label: 'You' },
  { section: 'topic', label: 'Topics' },
  { section: 'person', label: 'People' }
]

/** DB serializes local wall-clock with a trailing `Z`; strip it so the day is right. */
function updatedLabel(m: MemoryItem): string {
  const raw = m.updatedAt ?? m.createdAt
  if (!raw) return ''
  const d = new Date(raw.replace(/Z$/, ''))
  return Number.isNaN(d.getTime()) ? '' : `Updated ${format(d, 'MMM d')}`
}

function detailsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((d) => d.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

// ─── List row ─────────────────────────────────────────────────────────────────

function MemoryRow({
  item,
  onOpen,
  onToggle,
  onDelete
}: {
  item: MemoryItem
  onOpen: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const disabled = item.isActive === false
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group hover:bg-muted/55 focus-visible:bg-muted/55 relative flex h-10 cursor-pointer items-center gap-3.5 px-3 outline-none"
    >
      <span
        className={cn(
          'max-w-[60%] shrink-0 truncate text-sm font-medium',
          disabled && 'text-muted-foreground'
        )}
      >
        {item.key}
      </span>
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
        {item.summary || <span className="italic">No summary yet</span>}
      </span>

      {/* Fixed slot: a chevron at rest, the eye/trash actions on hover — the
          slot keeps its width both ways so the swap never nudges the row. */}
      <div className="relative flex h-7 w-16 shrink-0 items-center justify-end">
        <ChevronRightIcon
          className="text-muted-foreground/40 size-4 transition-opacity group-hover:opacity-0"
          data-icon
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-7"
            title={disabled ? 'Restore' : 'Disable'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {disabled ? (
              <EyeIcon className="size-3.5" data-icon />
            ) : (
              <EyeOffIcon className="size-3.5" data-icon />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2Icon className="size-3.5" data-icon />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
      {children}
    </span>
  )
}

function MemoryDetail({
  item,
  onBack,
  onPatched,
  onDeleted
}: {
  item: MemoryItem
  onBack: () => void
  onPatched: (next: MemoryItem) => void
  onDeleted: () => void
}) {
  const [key, setKey] = useState(item.key)
  const [summary, setSummary] = useState(item.summary)
  const [detailsText, setDetailsText] = useState(() => item.details.join('\n'))
  const disabled = item.isActive === false

  type MemoryPatch = Partial<Pick<MemoryItem, 'key' | 'summary'>> & {
    details?: string[]
    isActive?: boolean
  }

  // Re-sync when a different entry is opened.
  useEffect(() => {
    setKey(item.key)
    setSummary(item.summary)
    setDetailsText(item.details.join('\n'))
  }, [item.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    async (patch: MemoryPatch) => {
      try {
        await updateMemory(item.id, patch)
        onPatched({ ...item, ...patch })
      } catch (e) {
        sileo.error({
          title: 'Not saved',
          description: e instanceof Error ? e.message : 'Try again'
        })
      }
    },
    [item, onPatched]
  )

  const handleDelete = async () => {
    try {
      await deleteMemory(item.id, true)
      onDeleted()
    } catch (e) {
      sileo.error({
        title: 'Failed to delete',
        description: e instanceof Error ? e.message : 'Try again'
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-4" data-icon />
          Memory
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => save({ isActive: disabled })}
          >
            {disabled ? 'Restore' : 'Disable'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onBlur={() => {
          const v = key.trim()
          if (v && v !== item.key) save({ key: v })
          else setKey(item.key)
        }}
        placeholder="Title"
        aria-label="Title"
        className="placeholder:text-muted-foreground/50 -my-1 border-0 bg-transparent p-0 text-lg font-semibold outline-none"
      />

      {updatedLabel(item) && (
        <p className="text-muted-foreground/70 -mt-3 text-xs">
          {updatedLabel(item)}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Summary</FieldLabel>
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => {
            const v = summary.trim()
            if (v !== item.summary) save({ summary: v })
          }}
          placeholder="A compact phrase — what this entry covers"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Details</FieldLabel>
        <Textarea
          rows={6}
          value={detailsText}
          onChange={(e) => setDetailsText(e.target.value)}
          onBlur={() => {
            const next = detailsFromText(detailsText)
            if (JSON.stringify(next) !== JSON.stringify(item.details)) {
              save({ details: next })
            }
          }}
          placeholder="One fact per line"
        />
      </div>
    </div>
  )
}

// ─── Natural-language composer ────────────────────────────────────────────────

function MemoryComposer({
  scopeMemoryId,
  onApplied
}: {
  scopeMemoryId?: string
  onApplied: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    try {
      const { applied } = await instructMemory(t, scopeMemoryId)
      setText('')
      if (applied > 0) {
        sileo.success({
          title: 'Memory updated',
          description: `${applied} change${applied === 1 ? '' : 's'} applied`
        })
        onApplied()
      } else {
        sileo.info({
          title: 'No change',
          description: "That didn't call for a memory update."
        })
      }
    } catch (e) {
      sileo.error({
        title: "Couldn't apply that",
        description: e instanceof Error ? e.message : 'Try again'
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-border focus-within:border-ring flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        rows={1}
        disabled={busy}
        placeholder={
          scopeMemoryId
            ? 'Tell the assistant what to change or remove…'
            : 'Tell the assistant what to remember…'
        }
        className="placeholder:text-muted-foreground max-h-32 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm outline-none"
      />
      <Button
        type="button"
        size="icon"
        className="size-7 shrink-0 rounded-full"
        disabled={!text.trim() || busy}
        onClick={submit}
      >
        {busy ? (
          <LoaderIcon className="size-4 animate-spin" data-icon />
        ) : (
          <ArrowUpIcon className="size-4" data-icon />
        )}
      </Button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MemorySettings({ form }: { form: UseFormReturnType }) {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const lcmEnabled = form.watch('memory.lcmEnabled') ?? true

  const load = useCallback(async () => {
    try {
      setMemories(await getMemories())
    } catch (e) {
      sileo.error({
        title: 'Failed to load memories',
        description: e instanceof Error ? e.message : 'Try again'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = useMemo(
    () => memories.find((m) => m.id === selectedId) ?? null,
    [memories, selectedId]
  )
  useEffect(() => {
    if (selectedId && !loading && !selected) setSelectedId(null)
  }, [selectedId, selected, loading])

  const patchLocal = useCallback((next: MemoryItem) => {
    setMemories((ms) => ms.map((m) => (m.id === next.id ? next : m)))
  }, [])

  const handleNew = async () => {
    try {
      const row = await createMemory({
        section: 'topic',
        key: 'New memory',
        summary: '',
        details: [],
        source: 'explicit'
      })
      await load()
      setSelectedId(row.id)
    } catch (e) {
      sileo.error({
        title: 'Failed to create',
        description: e instanceof Error ? e.message : 'Try again'
      })
    }
  }

  const handleToggle = async (item: MemoryItem) => {
    patchLocal({ ...item, isActive: item.isActive === false })
    try {
      await updateMemory(item.id, { isActive: item.isActive === false })
    } catch {
      load()
    }
  }

  const handleDelete = async (item: MemoryItem) => {
    setMemories((ms) => ms.filter((m) => m.id !== item.id))
    try {
      await deleteMemory(item.id, true)
    } catch {
      load()
    }
  }

  // ── Detail view ──
  if (selected) {
    return (
      <div className="flex flex-col gap-6">
        <MemoryDetail
          item={selected}
          onBack={() => setSelectedId(null)}
          onPatched={patchLocal}
          onDeleted={() => {
            setSelectedId(null)
            load()
          }}
        />
        <MemoryComposer scopeMemoryId={selected.id} onApplied={load} />
      </div>
    )
  }

  // ── List view ──
  const active = memories.filter((m) => m.isActive !== false)
  const inactive = memories.filter((m) => m.isActive === false)
  const activeGroups = SECTION_GROUPS.map((g) => ({
    ...g,
    rows: active.filter((m) => m.section === g.section)
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="flex flex-col gap-8">
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">
            Stored memories
            <span className="text-muted-foreground ml-1.5 text-xs font-normal tabular-nums">
              {memories.length}
            </span>
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={handleNew}>
            <PlusIcon className="mr-1 size-3.5" data-icon />
            New
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
            No memories yet — they're added automatically after conversations,
            or tell the assistant to remember something below.
          </div>
        ) : (
          <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {activeGroups.map((g) => (
              <div key={g.section}>
                <p className="text-muted-foreground px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide uppercase">
                  {g.label}
                </p>
                {g.rows.map((m) => (
                  <MemoryRow
                    key={m.id}
                    item={m}
                    onOpen={() => setSelectedId(m.id)}
                    onToggle={() => handleToggle(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            ))}

            {inactive.length > 0 && (
              <div>
                <p className="text-muted-foreground/70 px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide uppercase">
                  Disabled · {inactive.length}
                </p>
                {inactive.map((m) => (
                  <MemoryRow
                    key={m.id}
                    item={m}
                    onOpen={() => setSelectedId(m.id)}
                    onToggle={() => handleToggle(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <MemoryComposer onApplied={load} />
      </div>
    </div>
  )
}
