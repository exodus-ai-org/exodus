// src/renderer/components/philharmonic/teams/team-editor.tsx
// NOTE: useEffect to sync draft from team prop removed — key={team.id} at the
// call site causes React to remount when the team changes, so the useState
// initializer always receives the fresh value on mount.
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TeamData } from '@/stores/philharmonic'

export interface TeamEditorProps {
  team: TeamData
  isNew?: boolean
  onClose: () => void
  onSave: (data: Partial<TeamData>) => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-1 text-[11px] tracking-wider uppercase">
      {children}
    </div>
  )
}

export function TeamEditor({
  team,
  isNew = false,
  onClose,
  onSave
}: TeamEditorProps) {
  const [draft, setDraft] = useState<TeamData>(team)
  const canSave = draft.name.trim().length > 0

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex h-14 shrink-0 items-center border-b pr-14 pl-5">
        <div className="min-w-0">
          <div className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Team
          </div>
          <div className="text-foreground truncate text-sm font-semibold">
            {draft.name || 'New team'}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <FieldLabel>
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="border-border bg-muted rounded-lg"
          />
        </div>
        <div>
          <FieldLabel>Icon (emoji, optional)</FieldLabel>
          <Input
            value={draft.icon ?? ''}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            maxLength={4}
            className="border-border bg-muted rounded-lg"
          />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            className="border-border bg-muted min-h-20 rounded-lg"
            placeholder="Short summary of what this team does."
          />
        </div>
        <div>
          <FieldLabel>System prompt</FieldLabel>
          <Textarea
            value={draft.systemPrompt ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, systemPrompt: e.target.value })
            }
            className="border-border bg-muted min-h-40 rounded-lg"
            placeholder="Shared instructions added to every member of this team's prompt."
          />
        </div>
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
