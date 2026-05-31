// src/renderer/components/agent-x/employees/employee-editor.tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import {
  getAgentMemories,
  getAvailableSkills,
  getTeams
} from '@/services/agent-x'
import { getMcpServers, type McpServerItem } from '@/services/mcp-service'
import type { AgentData, TeamData } from '@/stores/agent-x'

import { AvatarPicker } from './avatar-picker'

const NO_TEAM = '__none__'

export function EmployeeEditor({
  employee,
  onSave,
  onClose
}: {
  employee: AgentData
  onSave: (data: Partial<AgentData>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AgentData>(employee)
  const [skills, setSkills] = useState<Array<{ slug: string; name: string }>>(
    []
  )
  const [mcpServers, setMcpServers] = useState<McpServerItem[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [memories, setMemories] = useState<
    Array<{ id: string; key: string; value: unknown }>
  >([])

  useEffect(() => setDraft(employee), [employee])
  useEffect(() => {
    getAvailableSkills().then(setSkills)
    getMcpServers().then(setMcpServers)
    getTeams().then(setTeams)
    getAgentMemories(employee.id).then((m) => setMemories(m as never))
  }, [employee.id])

  const toggle = (list: string[] | null, key: string) => {
    const set = new Set(list ?? [])
    set.has(key) ? set.delete(key) : set.add(key)
    return [...set]
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <AvatarPicker
        seed={draft.avatarSeed}
        style={draft.avatarStyle}
        onChange={(a) => setDraft({ ...draft, ...a })}
      />
      <div className="grid gap-1">
        <Label>Name</Label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>Team</Label>
        <Select
          value={draft.teamId ?? NO_TEAM}
          onValueChange={(v) =>
            setDraft({ ...draft, teamId: v === NO_TEAM ? null : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="No team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEAM}>No team</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.icon ? `${t.icon} ` : ''}
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Manage teams from the Teams page. A team's system prompt applies to
          every member.
        </p>
      </div>
      <div className="grid gap-1">
        <Label>System Prompt</Label>
        <Textarea
          value={draft.systemPrompt ?? ''}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
          className="min-h-24"
          placeholder="Layered on top of the team's prompt."
        />
      </div>
      <div className="grid gap-1">
        <Label>Skills</Label>
        <div className="flex flex-wrap gap-1">
          {skills.length === 0 && (
            <span className="text-muted-foreground text-xs">
              No skills installed yet.
            </span>
          )}
          {skills.map((s) => {
            const selected = draft.skillSlugs?.includes(s.slug) ?? false
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    skillSlugs: toggle(draft.skillSlugs, s.slug)
                  })
                }
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent/40'
                )}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid gap-1">
        <Label>MCP Servers</Label>
        <div className="flex flex-wrap gap-1">
          {mcpServers.length === 0 && (
            <span className="text-muted-foreground text-xs">
              No MCP servers configured yet.
            </span>
          )}
          {mcpServers.map((s) => {
            const selected = draft.mcpServerNames?.includes(s.name) ?? false
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    mcpServerNames: toggle(draft.mcpServerNames, s.name)
                  })
                }
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent/40'
                )}
              >
                {s.name}
              </button>
            )
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          If none are selected, the employee can use all available servers.
        </p>
      </div>
      <div className="grid gap-1">
        <Label>Memory (read-only)</Label>
        <div className="text-muted-foreground space-y-1 text-xs">
          {memories.length === 0 && <span>No accumulated memory yet</span>}
          {memories.map((m) => (
            <div key={m.id} className="bg-muted/50 rounded p-1">
              <b>{m.key}</b>: {JSON.stringify(m.value)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(draft)}>Save</Button>
      </div>
    </div>
  )
}
