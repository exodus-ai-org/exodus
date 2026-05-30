import {
  DEFAULT_AVATAR_STYLE,
  randomAvatarSeed
} from '@shared/constants/avatar'
// src/renderer/components/agent-x/employees/employees-page.tsx
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { createAgentApi, getAgents, updateAgentApi } from '@/services/agent-x'
import type { AgentData } from '@/stores/agent-x'

import { EmployeeAvatar } from './employee-avatar'
import { EmployeeEditor } from './employee-editor'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<AgentData[]>([])
  const [editing, setEditing] = useState<AgentData | null>(null)

  const load = () => getAgents().then(setEmployees)
  useEffect(() => {
    load()
  }, [])

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
        <h2 className="text-lg font-medium">员工</h2>
        <Button onClick={create}>
          <Plus className="mr-1 h-4 w-4" />
          新建
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {employees.map((e) => (
          <button
            key={e.id}
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
              {e.team && (
                <div className="text-muted-foreground truncate text-xs">
                  {e.team}
                </div>
              )}
            </div>
          </button>
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
    </div>
  )
}
