// src/renderer/components/philharmonic/employees/employee-editor.tsx
import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
// NOTE: useEffect to sync draft from employee prop removed — key={employee.id}
// at the call site causes React to remount when the employee changes, so the
// useState initializer always receives the fresh value on mount.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getMcpServers, type McpServerItem } from '@/services/mcp-service'
import {
  getAgentMemories,
  getAvailableSkills,
  getTeams
} from '@/services/philharmonic'
import type { AgentData, TeamData } from '@/stores/philharmonic'

import { AvatarPicker } from './avatar-picker'
import { EmployeeAvatar } from './employee-avatar'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
      {children}
    </div>
  )
}

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

  useEffect(() => {
    getAvailableSkills().then(setSkills)
    getMcpServers().then(setMcpServers)
    getTeams().then(setTeams)
    if (!isNew) {
      getAgentMemories(employee.id).then((m) => setMemories(m as never))
    }
  }, [employee.id, isNew])

  const canSave = draft.name.trim().length > 0 && Boolean(draft.teamId)

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex h-14 shrink-0 items-center border-b pr-14 pl-5">
        <div className="min-w-0">
          <div className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Employee
          </div>
          <div className="text-foreground truncate text-sm font-semibold">
            {draft.name || 'New employee'}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger
              aria-label="Edit avatar"
              className="relative inline-block"
            >
              <EmployeeAvatar
                seed={draft.avatarSeed}
                style={draft.avatarStyle}
                size={64}
              />
              <span
                className="bg-card absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
              >
                <Pencil className="text-muted-foreground h-3 w-3" />
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <AvatarPicker
                seed={draft.avatarSeed}
                style={draft.avatarStyle}
                onChange={(a) => setDraft({ ...draft, ...a })}
              />
            </PopoverContent>
          </Popover>
          <div className="flex-1">
            <FieldLabel>Name</FieldLabel>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="border-border bg-muted rounded-lg"
            />
          </div>
        </div>

        {/* Team + Description */}
        <div>
          <FieldLabel>
            Team <span className="text-destructive">*</span>
          </FieldLabel>
          <Select
            value={draft.teamId ?? ''}
            onValueChange={(v) => setDraft({ ...draft, teamId: v })}
          >
            <SelectTrigger className="border-border bg-muted rounded-lg">
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
          <p className="text-muted-foreground mt-1 text-xs">
            Every employee belongs to a team — the team's system prompt is
            applied to all its members.
          </p>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <Input
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            className="border-border bg-muted rounded-lg"
            placeholder="One line about what this employee does."
          />
        </div>

        <div>
          <FieldLabel>System prompt</FieldLabel>
          <Textarea
            value={draft.systemPrompt ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, systemPrompt: e.target.value })
            }
            className="border-border bg-muted min-h-24 rounded-lg"
            placeholder="Layered on top of the team's prompt."
          />
        </div>

        <div>
          <FieldLabel>Skills</FieldLabel>
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

        <div>
          <FieldLabel>MCP servers</FieldLabel>
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
          <p className="text-muted-foreground mt-1 text-xs">
            If none are selected, the employee can use all available servers.
          </p>
        </div>

        {!isNew && (
          <div>
            <FieldLabel>Memory (read-only)</FieldLabel>
            <div className="text-muted-foreground space-y-1 text-xs">
              {memories.length === 0 && <span>No accumulated memory yet</span>}
              {memories.map((m) => (
                <div key={m.id} className="bg-muted rounded-md p-1.5">
                  <b className="text-foreground">{m.key}</b>:{' '}
                  {JSON.stringify(m.value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-end gap-1.5 border-t px-5">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => canSave && onSave(draft)}
          disabled={!canSave}
        >
          {isNew ? 'Create' : 'Save'}
        </Button>
      </footer>
    </div>
  )
}
