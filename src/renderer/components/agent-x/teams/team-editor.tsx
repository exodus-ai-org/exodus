// src/renderer/components/agent-x/teams/team-editor.tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TeamData } from '@/stores/agent-x'

export interface TeamEditorProps {
  team: TeamData
  isNew?: boolean
  onClose: () => void
  onSave: (data: Partial<TeamData>) => void
}

export function TeamEditor({
  team,
  isNew = false,
  onClose,
  onSave
}: TeamEditorProps) {
  const [draft, setDraft] = useState<TeamData>(team)
  useEffect(() => setDraft(team), [team])
  const canSave = draft.name.trim().length > 0

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="grid gap-1">
        <Label>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label>Icon (emoji, optional)</Label>
        <Input
          value={draft.icon ?? ''}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          maxLength={4}
        />
      </div>
      <div className="grid gap-1">
        <Label>Description</Label>
        <Textarea
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="min-h-20"
          placeholder="Short summary of what this team does."
        />
      </div>
      <div className="grid gap-1">
        <Label>System Prompt</Label>
        <Textarea
          value={draft.systemPrompt ?? ''}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
          className="min-h-40"
          placeholder="Shared instructions added to every member of this team's prompt."
        />
      </div>
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
