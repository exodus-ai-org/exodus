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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  getAgentMemories,
  getAvailableSkills,
  getTeams
} from '@/services/agent-x'
import { getMcpServers, type McpServerItem } from '@/services/mcp-service'
import type { AgentData, TeamData } from '@/stores/agent-x'

import { AvatarPicker } from './avatar-picker'

export function EmployeeEditor({
  employee,
  isNew = false,
  onSave,
  onClose
}: {
  employee: AgentData
  isNew?: boolean
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
    // No memory rows for an employee that doesn't exist yet.
    if (!isNew) {
      getAgentMemories(employee.id).then((m) => setMemories(m as never))
    }
  }, [employee.id, isNew])

  const canSave = draft.name.trim().length > 0 && Boolean(draft.teamId)

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
        <Label>
          Team <span className="text-destructive">*</span>
        </Label>
        <Select
          value={draft.teamId ?? ''}
          onValueChange={(v) => setDraft({ ...draft, teamId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.icon ? `${t.icon} ` : ''}
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Every employee belongs to a team — the team's system prompt is applied
          to all its members.
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
        {skills.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            No skills installed yet.
          </span>
        ) : (
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={4}
            value={draft.skillSlugs ?? []}
            onValueChange={(v) =>
              setDraft({ ...draft, skillSlugs: v as string[] })
            }
            className="flex-wrap"
          >
            {skills.map((s) => (
              <ToggleGroupItem key={s.slug} value={s.slug}>
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <div className="grid gap-1">
        <Label>MCP Servers</Label>
        {mcpServers.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            No MCP servers configured yet.
          </span>
        ) : (
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={4}
            value={draft.mcpServerNames ?? []}
            onValueChange={(v) =>
              setDraft({ ...draft, mcpServerNames: v as string[] })
            }
            className="flex-wrap"
          >
            {mcpServers.map((s) => (
              <ToggleGroupItem key={s.id} value={s.name}>
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <p className="text-muted-foreground text-xs">
          If none are selected, the employee can use all available servers.
        </p>
      </div>
      {!isNew && (
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
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(draft)} disabled={!canSave}>
          {isNew ? 'Create' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
