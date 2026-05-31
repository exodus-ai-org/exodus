// src/renderer/components/agent-x/employees/employee-editor.tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAgentMemories, getAvailableSkills } from '@/services/agent-x'
import type { AgentData } from '@/stores/agent-x'

import { AvatarPicker } from './avatar-picker'

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
  const [memories, setMemories] = useState<
    Array<{ id: string; key: string; value: unknown }>
  >([])

  useEffect(() => setDraft(employee), [employee])
  useEffect(() => {
    getAvailableSkills().then(setSkills)
    getAgentMemories(employee.id).then((m) => setMemories(m as never))
  }, [employee.id])

  const toggle = (list: string[] | null, slug: string) => {
    const set = new Set(list ?? [])
    set.has(slug) ? set.delete(slug) : set.add(slug)
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
        <Input
          value={draft.team ?? ''}
          onChange={(e) => setDraft({ ...draft, team: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>System Prompt</Label>
        <Textarea
          value={draft.systemPrompt ?? ''}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
          className="min-h-24"
        />
      </div>
      <div className="grid gap-1">
        <Label>Skills</Label>
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  skillSlugs: toggle(draft.skillSlugs, s.slug)
                })
              }
              className={`rounded border px-2 py-0.5 text-xs ${draft.skillSlugs?.includes(s.slug) ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
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
