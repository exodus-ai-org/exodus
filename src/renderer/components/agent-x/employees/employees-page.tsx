// src/renderer/components/agent-x/employees/employees-page.tsx
import {
  DEFAULT_AVATAR_STYLE,
  randomAvatarSeed
} from '@shared/constants/avatar'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

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
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  createAgentApi,
  deleteAgentApi,
  getAgents,
  getTeams,
  updateAgentApi
} from '@/services/agent-x'
import type { AgentData, TeamData } from '@/stores/agent-x'

import { EmployeeAvatar } from './employee-avatar'
import { EmployeeEditor } from './employee-editor'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  const [editing, setEditing] = useState<AgentData | null>(null)
  const [confirming, setConfirming] = useState<AgentData | null>(null)

  const load = () => getAgents().then(setEmployees)
  useEffect(() => {
    load()
    getTeams().then(setTeams)
  }, [])

  const teamsById = new Map(teams.map((t) => [t.id, t]))

  const create = async () => {
    const emp = await createAgentApi({
      name: 'New Employee',
      avatarSeed: randomAvatarSeed(),
      avatarStyle: DEFAULT_AVATAR_STYLE
    })
    setEmployees((p) => [...p, emp])
    setEditing(emp)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Employees</h2>
        <Button onClick={create}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {employees.map((e) => (
          <ContextMenu key={e.id}>
            <ContextMenuTrigger>
              <button
                onClick={() => setEditing(e)}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 text-left"
              >
                <EmployeeAvatar
                  seed={e.avatarSeed}
                  style={e.avatarStyle}
                  size={40}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.name}</div>
                  {(() => {
                    const t = e.teamId ? teamsById.get(e.teamId) : null
                    return t ? (
                      <div className="text-muted-foreground truncate text-xs">
                        {t.icon ? `${t.icon} ` : ''}
                        {t.name}
                      </div>
                    ) : null
                  })()}
                </div>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onSelect={() => setConfirming(e)}
              >
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <SheetContent className="w-[480px] sm:max-w-none">
          {editing && (
            <EmployeeEditor
              employee={editing}
              onClose={() => setEditing(null)}
              onSave={async (data) => {
                const updated = await updateAgentApi(editing.id, data)
                setEmployees((p) =>
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
            <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? `"${confirming.name}" will be permanently removed along with their accumulated memory.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirming) return
                const id = confirming.id
                setConfirming(null)
                await deleteAgentApi(id)
                setEmployees((p) => p.filter((x) => x.id !== id))
                setEditing((cur) => (cur?.id === id ? null : cur))
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
