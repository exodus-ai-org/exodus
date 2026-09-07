import { TEST_IDS } from '@shared/constants/test-ids'
import { UseFormReturnType } from '@shared/schemas/settings-schema'
import type {
  KnowledgeDocData,
  KnowledgeIndexStatus,
  LightRagHealthDto
} from '@shared/types/knowledge-base'
import { getHttpErrorMessage } from '@shared/utils/http'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertCircleIcon,
  BookOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import { sileo } from 'sileo'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
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
import { Textarea } from '@/components/ui/textarea'

import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getKnowledgeDocs,
  reindexAll,
  testKnowledgeBaseConnection,
  updateKnowledgeDoc
} from '../../../services/knowledge-base'
import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

const QUERY_MODES = [
  { label: 'Native', value: 'naive' },
  { label: 'Local', value: 'local' },
  { label: 'Global', value: 'global' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Mix', value: 'mix' }
] as const

const STATUS_BADGE: Record<
  KnowledgeIndexStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Indexing…', variant: 'secondary' },
  processed: { label: 'Indexed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  stale: { label: 'Needs reindex', variant: 'outline' }
}

const isBusy = (docs: KnowledgeDocData[]) =>
  docs.some(
    (d) => d.indexStatus === 'pending' || d.indexStatus === 'processing'
  )

// ─── Document dialog ─────────────────────────────────────────────────────────

interface DocDialogProps {
  open: boolean
  doc: KnowledgeDocData | null
  onClose: () => void
  onSaved: () => void
}

function DocDialog({ open, doc, onClose, onSaved }: DocDialogProps) {
  const isEdit = !!doc
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(doc?.title ?? '')
    setContent(doc?.content ?? '')
  }, [doc, open])

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      if (isEdit && doc) {
        await updateKnowledgeDoc(doc.id, {
          title: title.trim(),
          content: content.trim()
        })
      } else {
        await createKnowledgeDoc({
          title: title.trim(),
          content: content.trim()
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      sileo.error({
        title: 'Failed to save document',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        data-testid={TEST_IDS.knowledgeBase.docDialog}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit document' : 'Add document'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid={TEST_IDS.knowledgeBase.docTitleInput}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Content</Label>
            <Textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              data-testid={TEST_IDS.knowledgeBase.docContentInput}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !title.trim() || !content.trim()}
            onClick={handleSave}
            data-testid={TEST_IDS.knowledgeBase.docSaveButton}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── List item ───────────────────────────────────────────────────────────────

function DocListItem({
  doc,
  onEdit,
  onDelete
}: {
  doc: KnowledgeDocData
  onEdit: (d: KnowledgeDocData) => void
  onDelete: (d: KnowledgeDocData) => void
}) {
  const badge = STATUS_BADGE[doc.indexStatus]
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onEdit(doc)}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="truncate text-sm font-medium">{doc.title}</span>
          <Badge
            variant={badge.variant}
            className="ml-auto"
            title={doc.indexError ?? undefined}
          >
            {badge.label}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Updated {formatDistanceToNow(new Date(doc.updatedAt))} ago
        </p>
      </button>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="Edit"
          onClick={() => onEdit(doc)}
        >
          <PencilIcon className="size-3.5" data-icon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-7"
          title="Delete"
          onClick={() => onDelete(doc)}
        >
          <Trash2Icon className="size-3.5" data-icon />
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function KnowledgeBase({ form }: { form: UseFormReturnType }) {
  const [testing, setTesting] = useState(false)
  const [docs, setDocs] = useState<KnowledgeDocData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KnowledgeDocData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocData | null>(
    null
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const url = form.watch('knowledgeBase.url')

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await getKnowledgeDocs())
    } catch (e) {
      sileo.error({
        title: 'Failed to load documents',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (url) loadDocs()
    else setLoading(false)
  }, [url, loadDocs])

  // Poll while any document is still indexing so the badges animate.
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (url && isBusy(docs)) {
      pollRef.current = setInterval(loadDocs, 5000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [url, docs, loadDocs])

  const handleTest = async () => {
    setTesting(true)
    try {
      const h: LightRagHealthDto = await testKnowledgeBaseConnection()
      const parts = [
        `LLM: ${h.llmModel ?? '?'}`,
        `Embedding: ${h.embeddingModel ?? '?'}${h.embeddingDim ? ` (${h.embeddingDim}d)` : ''}`,
        h.documentCount != null ? `${h.documentCount} docs` : null
      ].filter(Boolean)
      sileo.success({ title: 'Connected', description: parts.join(' · ') })
    } catch (e) {
      sileo.error({
        title: 'Failed to connect',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setTesting(false)
    }
  }

  const handleReindex = async () => {
    try {
      const { count } = await reindexAll()
      sileo.success({ title: `Queued ${count} document(s) for reindexing` })
      await loadDocs()
    } catch (e) {
      sileo.error({
        title: 'Failed to reindex',
        description: getHttpErrorMessage(e)
      })
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }
  const openEdit = (d: KnowledgeDocData) => {
    setEditTarget(d)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteKnowledgeDoc(deleteTarget.id)
      setDocs((p) => p.filter((d) => d.id !== deleteTarget.id))
    } catch (e) {
      sileo.error({
        title: 'Failed to delete document',
        description: getHttpErrorMessage(e)
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <Alert className="mb-4">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription className="inline">
          Exodus's knowledge base is optional and powered by a{' '}
          <strong>self-hosted LightRAG server that you run</strong> — Exodus
          only connects to it, pushing your documents and asking for relevant
          context; it never runs, upgrades, or manages LightRAG itself. Leave
          the URL empty to keep the knowledge base disabled. Retrieval is
          context-only: LightRAG finds relevant passages, but your configured
          chat model always writes the answer. The embedding model is{' '}
          <strong>locked once you ingest a document</strong> — changing it later
          requires wiping LightRAG's storage and re-adding every document, so
          pick one you'll keep.
        </AlertDescription>
      </Alert>

      <SettingsSection>
        <Controller
          control={form.control}
          name="knowledgeBase.url"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="Server URL"
              description="Your self-hosted LightRAG server. Leave empty to disable the knowledge base."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                placeholder="http://localhost:9621"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="knowledgeBase.apiKey"
          render={({ field, fieldState }) => (
            <SettingsRow
              label="API Key"
              description="Sent as the X-API-Key header (your LIGHTRAG_API_KEY)."
              error={fieldState.error}
              layout="vertical"
            >
              <Input
                type="password"
                autoComplete="off"
                {...field}
                value={field.value ?? ''}
              />
            </SettingsRow>
          )}
        />

        <Controller
          control={form.control}
          name="knowledgeBase.queryMode"
          render={({ field }) => (
            <SettingsRow
              label="Query mode"
              description="mix blends the knowledge graph and vector search — best quality, slightly slower."
            >
              <SettingsSelect
                value={field.value ?? 'mix'}
                onValueChange={field.onChange}
                options={QUERY_MODES.map(({ label, value }) => ({
                  value,
                  label
                }))}
              />
            </SettingsRow>
          )}
        />

        <Collapsible>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground text-xs font-medium">
            Advanced
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-col gap-4">
            <Controller
              control={form.control}
              name="knowledgeBase.topK"
              render={({ field, fieldState }) => (
                <SettingsRow
                  label="Top K"
                  description="Knowledge-graph entities / relations to retrieve. Default 60."
                  error={fieldState.error}
                >
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    className="w-20"
                    placeholder="60"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingsRow>
              )}
            />
            <Controller
              control={form.control}
              name="knowledgeBase.chunkTopK"
              render={({ field, fieldState }) => (
                <SettingsRow
                  label="Chunk Top K"
                  description="Text chunks kept after reranking. Default 10."
                  error={fieldState.error}
                >
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    className="w-20"
                    placeholder="10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </SettingsRow>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <SettingsRow
          label="Connection"
          description="Verify Exodus can reach your LightRAG server."
          layout="vertical"
        >
          <Button
            type="button"
            variant="outline"
            disabled={testing || !url}
            onClick={handleTest}
            data-testid={TEST_IDS.knowledgeBase.testConnectionButton}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </Button>
        </SettingsRow>
      </SettingsSection>

      {url ? (
        <SettingsSection title="Documents" plain>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="text-muted-foreground size-4" />
              <span className="text-sm font-medium">
                Documents
                {docs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {docs.length}
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReindex}
                data-testid={TEST_IDS.knowledgeBase.reindexButton}
              >
                Reindex all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={openAdd}
                data-testid={TEST_IDS.knowledgeBase.addButton}
              >
                <PlusIcon className="mr-1 size-3.5" data-icon />
                Add document
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
              No documents yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <DocListItem
                  key={doc.id}
                  doc={doc}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </SettingsSection>
      ) : (
        <p className="text-muted-foreground px-1 text-xs">
          Add a server URL above to manage documents.
        </p>
      )}

      <DocDialog
        open={dialogOpen}
        doc={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={loadDocs}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title ?? ''}&quot; will be removed from the
              knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
