// src/renderer/components/philharmonic/workforce/workforce-page.tsx
import {
  DEFAULT_AVATAR_STYLE,
  randomAvatarSeed
} from '@shared/constants/avatar'
import {
  Building2Icon,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  UsersIcon
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { sileo } from 'sileo'

import { EmployeeAvatar } from '@/components/philharmonic/employees/employee-avatar'
import { EmployeeEditor } from '@/components/philharmonic/employees/employee-editor'
import { PhilharmonicEmptyState } from '@/components/philharmonic/empty-state'
import { hueStyle, pickHue } from '@/components/philharmonic/lib/hue'
import { TeamEditor } from '@/components/philharmonic/teams/team-editor'
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
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  createAgentApi,
  createTeamApi,
  deleteAgentApi,
  deleteTeamApi,
  getAgents,
  getTeams,
  updateAgentApi,
  updateTeamApi
} from '@/services/philharmonic'
import type { AgentData, TeamData } from '@/stores/philharmonic'

const UNASSIGNED_KEY = '__unassigned__'

interface EmployeeCardProps {
  employee: AgentData
  onEdit: (e: AgentData) => void
  onAskDelete: (e: AgentData) => void
}

function EmployeeCard({ employee, onEdit, onAskDelete }: EmployeeCardProps) {
  const modelChip = employee.model
  const tools = employee.toolAllowList ?? []
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          type="button"
          onClick={() => onEdit(employee)}
          className="group bg-muted hover:bg-accent flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors"
        >
          <EmployeeAvatar
            seed={employee.avatarSeed}
            style={employee.avatarStyle}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-sm font-semibold">
              {employee.name}
            </div>
            {employee.description && (
              <div className="text-muted-foreground line-clamp-2 text-[11.5px]">
                {employee.description}
              </div>
            )}
            {(modelChip || tools.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {modelChip && (
                  <span className="bg-accent text-accent-foreground rounded-md px-1.5 py-0.5 text-[10px]">
                    {modelChip}
                  </span>
                )}
                {tools.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="bg-background text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px]"
                  >
                    {t}
                  </span>
                ))}
                {tools.length > 2 && (
                  <span className="bg-background text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px]">
                    +{tools.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(employee)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => onAskDelete(employee)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

interface TeamSectionProps {
  team: TeamData | null // null = unassigned
  members: AgentData[]
  collapsed: boolean
  onToggle: () => void
  onEditEmployee: (e: AgentData) => void
  onAskDeleteEmployee: (e: AgentData) => void
  onEditTeam?: (t: TeamData) => void
  onAskDeleteTeam?: (t: TeamData) => void
  onAddEmployeeToTeam: (teamId: string | null) => void
}

function TeamSection({
  team,
  members,
  collapsed,
  onToggle,
  onEditEmployee,
  onAskDeleteEmployee,
  onEditTeam,
  onAskDeleteTeam,
  onAddEmployeeToTeam
}: TeamSectionProps) {
  const headerContent = (
    <button
      type="button"
      onClick={onToggle}
      className="hover:bg-background flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors"
    >
      <ChevronRight
        className={cn(
          'text-muted-foreground h-4 w-4 transition-transform',
          !collapsed && 'rotate-90'
        )}
      />
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base',
          !team && 'bg-background'
        )}
        style={team ? hueStyle(pickHue(team.id)) : undefined}
      >
        {team?.icon ??
          (team ? (
            <Building2Icon className="h-4 w-4 opacity-60" />
          ) : (
            <UsersIcon className="h-4 w-4 opacity-60" />
          ))}
      </span>
      <span className="text-foreground text-sm font-semibold">
        {team?.name ?? 'No team'}
      </span>
      <span className="bg-background text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-[10px]">
        {members.length}
      </span>
      {team?.description && (
        <span className="text-muted-foreground ml-2 truncate text-xs">
          {team.description}
        </span>
      )}
    </button>
  )

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1">
        {team ? (
          <ContextMenu>
            <ContextMenuTrigger>{headerContent}</ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onEditTeam?.(team)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit team
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onAddEmployeeToTeam(team.id)}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add employee here
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => onAskDeleteTeam?.(team)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete team
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          headerContent
        )}
      </div>
      {!collapsed && (
        <div className="ml-10 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <EmployeeCard
              key={m.id}
              employee={m}
              onEdit={onEditEmployee}
              onAskDelete={onAskDeleteEmployee}
            />
          ))}
          {/* Always render an Add placeholder card unless this is the
              read-only Unassigned bucket (signaled by team === null). */}
          {team && (
            <button
              type="button"
              onClick={() => onAddEmployeeToTeam(team.id)}
              className="border-border text-muted-foreground hover:text-primary flex min-h-[88px] items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add employee
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function emptyEmployeeDraft(teamId: string): AgentData {
  return {
    id: '',
    name: 'New Employee',
    description: null,
    teamId,
    avatarSeed: randomAvatarSeed(),
    avatarStyle: DEFAULT_AVATAR_STYLE,
    systemPrompt: null,
    toolAllowList: null,
    skillSlugs: null,
    mcpServerNames: null,
    model: null,
    provider: null,
    isActive: true,
    createdAt: '',
    updatedAt: ''
  }
}

function emptyTeamDraft(): TeamData {
  return {
    id: '',
    name: 'New Team',
    description: '',
    systemPrompt: '',
    icon: null,
    createdAt: '',
    updatedAt: ''
  }
}

export function WorkforcePage() {
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [teams, setTeams] = useState<TeamData[]>([])
  // Editor states carry both the draft and an isNew flag so Save can dispatch
  // to either createXxxApi or updateXxxApi without us tracking two pairs of
  // booleans.
  const [employeeEditor, setEmployeeEditor] = useState<{
    draft: AgentData
    isNew: boolean
  } | null>(null)
  const [teamEditor, setTeamEditor] = useState<{
    draft: TeamData
    isNew: boolean
  } | null>(null)
  const [confirmingEmployee, setConfirmingEmployee] =
    useState<AgentData | null>(null)
  const [confirmingTeam, setConfirmingTeam] = useState<TeamData | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    [UNASSIGNED_KEY]: true
  })

  useEffect(() => {
    getAgents().then(setEmployees)
    getTeams().then(setTeams)
  }, [])

  const byTeam = useMemo(() => {
    const map = new Map<string, AgentData[]>()
    for (const t of teams) map.set(t.id, [])
    const unassigned: AgentData[] = []
    for (const e of employees) {
      if (e.teamId && map.has(e.teamId)) map.get(e.teamId)!.push(e)
      else unassigned.push(e)
    }
    return { map, unassigned }
  }, [employees, teams])

  const toggle = (key: string) =>
    setCollapsed((p) => ({ ...p, [key]: !p[key] }))

  // Open the editor sheet with an uncommitted draft. The actual API call
  // happens on Save, not on click.
  const openNewEmployee = (teamId?: string | null) => {
    const target = teamId ?? teams[0]?.id
    if (!target) return // guarded by disabled button, but defensive
    setEmployeeEditor({ draft: emptyEmployeeDraft(target), isNew: true })
  }

  const openNewTeam = () => {
    setTeamEditor({ draft: emptyTeamDraft(), isNew: true })
  }

  const handleSaveEmployee = async (data: Partial<AgentData>) => {
    if (!employeeEditor) return
    if (!data.teamId) return // guarded by editor's disabled Save
    try {
      if (employeeEditor.isNew) {
        const created = await createAgentApi(data)
        setEmployees((p) => [...p, created])
        sileo.success({ title: `"${created.name}" created` })
      } else {
        const updated = await updateAgentApi(employeeEditor.draft.id, data)
        setEmployees((p) => p.map((x) => (x.id === updated.id ? updated : x)))
      }
      setEmployeeEditor(null)
    } catch (err) {
      sileo.error({
        title: 'Could not save the employee',
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const handleSaveTeam = async (data: Partial<TeamData>) => {
    if (!teamEditor) return
    try {
      if (teamEditor.isNew) {
        const created = await createTeamApi(data)
        setTeams((p) => [...p, created])
        sileo.success({ title: `"${created.name}" created` })
      } else {
        const updated = await updateTeamApi(teamEditor.draft.id, data)
        setTeams((p) => p.map((x) => (x.id === updated.id ? updated : x)))
      }
      setTeamEditor(null)
    } catch (err) {
      sileo.error({
        title: 'Could not save the team',
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const totalEmpty = employees.length === 0 && teams.length === 0
  const noTeams = teams.length === 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-border flex h-13 shrink-0 items-center justify-between border-b px-5">
        <div>
          <h1 className="text-foreground text-sm font-semibold">Workforce</h1>
          <p className="text-muted-foreground text-[11.5px]">
            {employees.length}{' '}
            {employees.length === 1 ? 'employee' : 'employees'} · {teams.length}{' '}
            {teams.length === 1 ? 'team' : 'teams'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={openNewTeam}>
            <Plus className="h-3.5 w-3.5" />
            Team
          </Button>
          <Button
            size="sm"
            onClick={() => openNewEmployee()}
            disabled={noTeams}
            title={noTeams ? 'Create a team first' : undefined}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Employee
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {totalEmpty ? (
          <PhilharmonicEmptyState
            avatars={[{ hue: 'lilac' }, { hue: 'mint' }, { hue: 'peach' }]}
            title="Start with a team"
            description="Every employee belongs to a team that contributes a shared system prompt. Create a team first, then add the employees that belong to it."
            action={{ label: '+ New team', onClick: openNewTeam }}
          />
        ) : (
          <div className="space-y-4">
            {teams.map((t) => (
              <TeamSection
                key={t.id}
                team={t}
                members={byTeam.map.get(t.id) ?? []}
                collapsed={collapsed[t.id] ?? false}
                onToggle={() => toggle(t.id)}
                onEditEmployee={(e) =>
                  setEmployeeEditor({ draft: e, isNew: false })
                }
                onAskDeleteEmployee={setConfirmingEmployee}
                onEditTeam={(team) =>
                  setTeamEditor({ draft: team, isNew: false })
                }
                onAskDeleteTeam={setConfirmingTeam}
                onAddEmployeeToTeam={(teamId) => openNewEmployee(teamId)}
              />
            ))}
            {byTeam.unassigned.length > 0 && (
              <TeamSection
                team={null}
                members={byTeam.unassigned}
                collapsed={collapsed[UNASSIGNED_KEY] ?? true}
                onToggle={() => toggle(UNASSIGNED_KEY)}
                onEditEmployee={(e) =>
                  setEmployeeEditor({ draft: e, isNew: false })
                }
                onAskDeleteEmployee={setConfirmingEmployee}
                // Unassigned section is informational — no "Add an employee"
                // affordance into it. Pass a no-op for the slot.
                onAddEmployeeToTeam={() => {}}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit sheets */}
      <Sheet
        open={employeeEditor !== null}
        onOpenChange={(o) => !o && setEmployeeEditor(null)}
      >
        <SheetContent className="w-[520px] p-0 sm:max-w-none">
          {employeeEditor && (
            <EmployeeEditor
              key={employeeEditor.draft.id}
              employee={employeeEditor.draft}
              isNew={employeeEditor.isNew}
              onClose={() => setEmployeeEditor(null)}
              onSave={handleSaveEmployee}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={teamEditor !== null}
        onOpenChange={(o) => !o && setTeamEditor(null)}
      >
        <SheetContent className="w-[520px] p-0 sm:max-w-none">
          {teamEditor && (
            <TeamEditor
              key={teamEditor.draft.id}
              team={teamEditor.draft}
              isNew={teamEditor.isNew}
              onClose={() => setTeamEditor(null)}
              onSave={handleSaveTeam}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm dialogs */}
      <AlertDialog
        open={confirmingEmployee !== null}
        onOpenChange={(o) => !o && setConfirmingEmployee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingEmployee ? (
                <>
                  <span className="bg-background rounded-md px-1.5 py-0.5 font-mono text-xs">
                    {confirmingEmployee.name}
                  </span>{' '}
                  will be permanently removed along with their accumulated
                  memory.
                </>
              ) : (
                ''
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!confirmingEmployee) return
                const id = confirmingEmployee.id
                const name = confirmingEmployee.name
                setConfirmingEmployee(null)
                try {
                  await deleteAgentApi(id)
                  setEmployees((p) => p.filter((x) => x.id !== id))
                  setEmployeeEditor((cur) =>
                    cur?.draft.id === id ? null : cur
                  )
                  sileo.success({ title: `"${name}" deleted` })
                } catch (err) {
                  sileo.error({
                    title: 'Could not delete the employee',
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

      <AlertDialog
        open={confirmingTeam !== null}
        onOpenChange={(o) => !o && setConfirmingTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingTeam ? (
                <>
                  <span className="bg-background rounded-md px-1.5 py-0.5 font-mono text-xs">
                    {confirmingTeam.name}
                  </span>{' '}
                  will be removed. Existing members keep their records but lose
                  this team affiliation.
                </>
              ) : (
                ''
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!confirmingTeam) return
                const id = confirmingTeam.id
                const name = confirmingTeam.name
                setConfirmingTeam(null)
                try {
                  await deleteTeamApi(id)
                  setTeams((p) => p.filter((x) => x.id !== id))
                  // Members of that team are now unassigned locally too.
                  setEmployees((p) =>
                    p.map((e) => (e.teamId === id ? { ...e, teamId: null } : e))
                  )
                  setTeamEditor((cur) => (cur?.draft.id === id ? null : cur))
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
