// src/renderer/components/philharmonic/knowledge/knowledge-base-page.tsx
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
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
      <header className="border-border flex h-13 shrink-0 items-center justify-between border-b px-5">
        <div>
          <h1 className="text-foreground text-sm font-semibold">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground text-[11.5px]">
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                    style={hueStyle(pickHue(b.key))}
                  >
                    {b.icon ?? '📁'}
                  </span>
                  <div className="text-foreground text-[12.5px] font-semibold">
                    {b.label}
                  </div>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                    {b.docs.length}
                  </span>
                  {b.teamId === null && (
                    <span
                      className="bg-accent text-accent-foreground rounded-md px-1.5 py-0.5 text-[10px]"
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
                      className="group bg-muted hover:bg-accent flex items-start gap-3 rounded-xl px-3.5 py-3 transition-colors"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={hueStyle(pickHue(d.id))}
                      >
                        📄
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground truncate text-sm font-semibold">
                          {d.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
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
                        className="text-muted-foreground hover:bg-background rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100"
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

        <div className="bg-muted flex flex-col gap-2 rounded-xl p-3.5">
          <div className="text-muted-foreground text-[11px] tracking-wider uppercase">
            New document
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="border-border bg-card rounded-lg"
          />
          <Select
            value={draftTeamKey}
            onValueChange={(v) => v && setDraftTeamKey(v)}
          >
            <SelectTrigger className="border-border bg-card rounded-lg">
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
            className="border-border bg-card min-h-40 rounded-lg"
          />
          <Button
            type="button"
            size="sm"
            onClick={add}
            disabled={!canAdd}
            className="w-full"
          >
            <Plus className="h-3.5 w-3.5" />
            Add document
          </Button>
          <p className="text-muted-foreground px-1 text-[10.5px]">
            General docs are visible to every Group. Team docs only appear when
            a member of that team is in the Group.
          </p>
        </div>
      </div>
    </div>
  )
}
