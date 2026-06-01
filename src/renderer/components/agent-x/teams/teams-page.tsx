// src/renderer/components/agent-x/teams/teams-page.tsx
import { Building2Icon, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { sileo } from 'sileo'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  createTeamApi,
  deleteTeamApi,
  getTeams,
  updateTeamApi
} from '@/services/agent-x'
import type { TeamData } from '@/stores/agent-x'

interface TeamEditorProps {
  team: TeamData
  onClose: () => void
  onSave: (data: Partial<TeamData>) => void
}

function TeamEditor({ team, onClose, onSave }: TeamEditorProps) {
  const [draft, setDraft] = useState<TeamData>(team)
  useEffect(() => setDraft(team), [team])

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="grid gap-1">
        <Label>Name</Label>
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
        <Button onClick={() => onSave(draft)}>Save</Button>
      </div>
    </div>
  )
}

export function TeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [editing, setEditing] = useState<TeamData | null>(null)
  const [confirming, setConfirming] = useState<TeamData | null>(null)

  const load = () => getTeams().then(setTeams)
  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    const t = await createTeamApi({
      name: 'New Team',
      description: '',
      systemPrompt: ''
    })
    setTeams((p) => [...p, t])
    setEditing(t)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Teams</h2>
        <Button onClick={create}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <ContextMenu key={t.id}>
            <ContextMenuTrigger>
              <button
                onClick={() => setEditing(t)}
                className="hover:bg-muted/50 flex w-full items-start gap-3 rounded-lg border p-3 text-left"
              >
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl">
                  {t.icon ?? <Building2Icon className="h-5 w-5 opacity-60" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-muted-foreground line-clamp-2 text-xs">
                      {t.description}
                    </div>
                  )}
                </div>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onClick={() => setConfirming(t)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        {teams.length === 0 && (
          <div className="text-muted-foreground col-span-full rounded-lg border border-dashed p-8 text-center text-sm">
            No teams yet. Create one to share a system prompt across multiple
            employees.
          </div>
        )}
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <SheetContent className="w-[480px] sm:max-w-none">
          {editing && (
            <TeamEditor
              team={editing}
              onClose={() => setEditing(null)}
              onSave={async (data) => {
                const updated = await updateTeamApi(editing.id, data)
                setTeams((p) =>
                  p.map((x) => (x.id === updated.id ? updated : x))
                )
                setEditing(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? `"${confirming.name}" will be removed. Existing employees keep their records but lose this team affiliation.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirming) return
                const id = confirming.id
                const name = confirming.name
                setConfirming(null)
                try {
                  await deleteTeamApi(id)
                  setTeams((p) => p.filter((x) => x.id !== id))
                  sileo.success({ title: `"${name}" deleted` })
                } catch (err) {
                  sileo.error({
                    title: 'Could not delete the team',
                    description:
                      err instanceof Error ? err.message : String(err)
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
