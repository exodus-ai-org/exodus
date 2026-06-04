// src/renderer/components/philharmonic/knowledge/knowledge-base-page.tsx
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getKnowledgeDocs
} from '@/services/philharmonic-chat'
import type { KnowledgeDocData } from '@/stores/philharmonic'

import { PhilharmonicEmptyState } from '../empty-state'
import { hueStyle, pickHue } from '../lib/hue'

export function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDocData[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = () => getKnowledgeDocs().then(setDocs)
  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!title.trim() || !content.trim()) return
    const doc = await createKnowledgeDoc({ title, content })
    setDocs((p) => [doc, ...p])
    setTitle('')
    setContent('')
  }

  const canAdd = title.trim().length > 0 && content.trim().length > 0
  const totalChars = docs.reduce((s, d) => s + d.content.length, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ph-border)] px-5">
        <div>
          <h1 className="text-sm font-semibold text-[var(--ph-text)]">
            Knowledge Base
          </h1>
          <p className="text-[11.5px] text-[var(--ph-text-muted)]">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'} ·{' '}
            {totalChars.toLocaleString()} characters
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px] gap-4 overflow-hidden p-5">
        <div className="flex flex-col gap-2 overflow-y-auto">
          {docs.length === 0 ? (
            <PhilharmonicEmptyState
              avatars={[{ hue: 'sky' }, { hue: 'lilac' }, { hue: 'honey' }]}
              title="No documents yet"
              description="Add notes, guides, or specs that your team can reference. The first one's free."
            />
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="group flex items-start gap-3 rounded-[var(--ph-radius-lg)] px-3.5 py-3 transition-shadow hover:shadow-[var(--ph-shadow-hover)]"
                style={{ background: 'var(--ph-surface-sunken)' }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ph-radius-md)] text-base"
                  style={hueStyle(pickHue(d.id))}
                >
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[var(--ph-text)]">
                    {d.title}
                  </h3>
                  <p className="line-clamp-2 text-xs text-[var(--ph-text-muted)]">
                    {d.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteKnowledgeDoc(d.id)
                    setDocs((p) => p.filter((x) => x.id !== d.id))
                  }}
                  aria-label="Delete document"
                  className="rounded-[var(--ph-radius-sm)] p-1 text-[var(--ph-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--ph-canvas)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div
          className="flex flex-col gap-2 rounded-[var(--ph-radius-lg)] p-3.5"
          style={{ background: 'var(--ph-surface-sunken)' }}
        >
          <div className="text-[11px] tracking-wider text-[var(--ph-text-muted)] uppercase">
            New document
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface)]"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Body"
            className="min-h-40 rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface)]"
          />
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="flex w-full items-center justify-center gap-1 rounded-[var(--ph-radius-md)] py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--ph-primary)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add document
          </button>
        </div>
      </div>
    </div>
  )
}
