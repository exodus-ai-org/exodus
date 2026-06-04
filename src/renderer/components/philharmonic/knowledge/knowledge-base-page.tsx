// src/renderer/components/philharmonic/knowledge/knowledge-base-page.tsx
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getTeams } from '@/services/philharmonic'
import {
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  getKnowledgeDocs
} from '@/services/philharmonic-chat'
import type { KnowledgeDocData, TeamData } from '@/stores/philharmonic'

import { PhilharmonicEmptyState } from '../empty-state'
import { hueStyle, pickHue } from '../lib/hue'

const GENERAL_KEY = '__general__'

interface Bucket {
  key: string
  label: string
  icon: string | null
  teamId: string | null
  docs: KnowledgeDocData[]
}

function groupByTeam(docs: KnowledgeDocData[], teams: TeamData[]): Bucket[] {
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const byTeam = new Map<string, KnowledgeDocData[]>()
  const general: KnowledgeDocData[] = []
  for (const d of docs) {
    if (d.teamId && teamById.has(d.teamId)) {
      const arr = byTeam.get(d.teamId) ?? []
      arr.push(d)
      byTeam.set(d.teamId, arr)
    } else {
      general.push(d)
    }
  }
  const buckets: Bucket[] = []
  if (general.length > 0) {
    buckets.push({
      key: GENERAL_KEY,
      label: 'General',
      icon: '🌐',
      teamId: null,
      docs: general
    })
  }
  for (const [id, list] of byTeam) {
    const t = teamById.get(id)!
    buckets.push({
      key: id,
      label: t.name,
      icon: t.icon,
      teamId: id,
      docs: list
    })
  }
  return buckets
}

export function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDocData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  // GENERAL_KEY sentinel = "General" (teamId: null). A real UUID string = that team.
  const [draftTeamKey, setDraftTeamKey] = useState<string>(GENERAL_KEY)

  useEffect(() => {
    getKnowledgeDocs().then(setDocs)
    getTeams().then(setTeams)
  }, [])

  const buckets = useMemo(() => groupByTeam(docs, teams), [docs, teams])

  const add = async () => {
    if (!title.trim() || !content.trim()) return
    const teamId = draftTeamKey === GENERAL_KEY ? null : draftTeamKey
    const doc = await createKnowledgeDoc({ title, content, teamId })
    setDocs((p) => [doc, ...p])
    setTitle('')
    setContent('')
  }

  const canAdd = title.trim().length > 0 && content.trim().length > 0
  const totalChars = docs.reduce((s, d) => s + d.content.length, 0)
  const teamLabel = useMemo(() => {
    const teamsWithDocs = buckets.filter((b) => b.teamId !== null).length
    const hasGeneral = buckets.some((b) => b.teamId === null)
    if (teamsWithDocs === 0) return hasGeneral ? 'General only' : 'no teams'
    return `${teamsWithDocs} ${teamsWithDocs === 1 ? 'team' : 'teams'}${hasGeneral ? ' + General' : ''}`
  }, [buckets])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-[var(--ph-border)] px-5">
        <div>
          <h1 className="text-sm font-semibold text-[var(--ph-text)]">
            Knowledge Base
          </h1>
          <p className="text-[11.5px] text-[var(--ph-text-muted)]">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'} ·{' '}
            {totalChars.toLocaleString()} characters · {teamLabel}
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px] gap-4 overflow-hidden p-5">
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {docs.length === 0 ? (
            <PhilharmonicEmptyState
              avatars={[{ hue: 'sky' }, { hue: 'lilac' }, { hue: 'honey' }]}
              title="No documents yet"
              description="Add notes, guides, or specs that your team can reference. The first one's free."
            />
          ) : (
            buckets.map((b) => (
              <section key={b.key}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--ph-radius-md)] text-sm"
                    style={hueStyle(pickHue(b.key))}
                  >
                    {b.icon ?? '📁'}
                  </span>
                  <div className="text-[12.5px] font-semibold text-[var(--ph-text)]">
                    {b.label}
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px]"
                    style={{
                      background: 'var(--ph-canvas)',
                      color: 'var(--ph-text-muted)'
                    }}
                  >
                    {b.docs.length}
                  </span>
                  {b.teamId === null && (
                    <span
                      className="rounded-[var(--ph-radius-sm)] px-1.5 py-0.5 text-[10px]"
                      style={{
                        background: 'var(--ph-primary-soft)',
                        color: 'var(--ph-primary-ink)'
                      }}
                      title="Visible to every Group"
                    >
                      shared
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {b.docs.map((d) => (
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
                  ))}
                </div>
              </section>
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
          <Select
            value={draftTeamKey}
            onValueChange={(v) => v && setDraftTeamKey(v)}
          >
            <SelectTrigger className="rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL_KEY}>🌐 General</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ''}
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <p className="px-1 text-[10.5px] text-[var(--ph-text-muted)]">
            General docs are visible to every Group. Team docs only appear when
            a member of that team is in the Group.
          </p>
        </div>
      </div>
    </div>
  )
}
