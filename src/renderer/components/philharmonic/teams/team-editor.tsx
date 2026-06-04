// src/renderer/components/philharmonic/teams/team-editor.tsx
import { useEffect, useState } from 'react'

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
    <div className="mb-1 text-[11px] tracking-wider text-[var(--ph-text-muted)] uppercase">
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
  useEffect(() => setDraft(team), [team])
  const canSave = draft.name.trim().length > 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ph-border)] px-5">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider text-[var(--ph-text-muted)] uppercase">
            Team
          </div>
          <div className="truncate text-sm font-semibold text-[var(--ph-text)]">
            {draft.name || 'New team'}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[var(--ph-radius-md)] px-3.5 text-xs font-medium text-[var(--ph-text)]"
            style={{ background: 'var(--ph-canvas)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSave && onSave(draft)}
            disabled={!canSave}
            className="h-8 rounded-[var(--ph-radius-md)] px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--ph-primary)' }}
          >
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <FieldLabel>
            Name <span style={{ color: 'var(--ph-danger)' }}>*</span>
          </FieldLabel>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface-sunken)]"
          />
        </div>
        <div>
          <FieldLabel>Icon (emoji, optional)</FieldLabel>
          <Input
            value={draft.icon ?? ''}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            maxLength={4}
            className="rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface-sunken)]"
          />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            className="min-h-20 rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface-sunken)]"
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
            className="min-h-40 rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface-sunken)]"
            placeholder="Shared instructions added to every member of this team's prompt."
          />
        </div>
      </div>
    </div>
  )
}
