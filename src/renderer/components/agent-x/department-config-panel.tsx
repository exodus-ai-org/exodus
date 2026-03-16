import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  getAvailableSkills,
  getMcpServers,
  type McpServerData
} from '@/services/agent-x'
import type { DepartmentData } from '@/stores/agent-x'
import { Trash2Icon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface DepartmentConfigPanelProps {
  department: DepartmentData
  onUpdate: (id: string, data: Partial<DepartmentData>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function DepartmentConfigPanel({
  department,
  onUpdate,
  onDelete,
  onClose
}: DepartmentConfigPanelProps) {
  const [name, setName] = useState(department.name)
  const [description, setDescription] = useState(department.description ?? '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    department.skillSlugs ?? []
  )
  const [selectedMcp, setSelectedMcp] = useState<string[]>(
    department.mcpServerNames ?? []
  )

  // Available options
  const [availableSkills, setAvailableSkills] = useState<
    Array<{ slug: string; name: string }>
  >([])
  const [availableMcp, setAvailableMcp] = useState<McpServerData[]>([])

  useEffect(() => {
    getAvailableSkills().then(setAvailableSkills)
    getMcpServers().then(setAvailableMcp)
  }, [])

  useEffect(() => {
    setName(department.name)
    setDescription(department.description ?? '')
    setSelectedSkills(department.skillSlugs ?? [])
    setSelectedMcp(department.mcpServerNames ?? [])
  }, [department])

  const handleSave = useCallback(() => {
    onUpdate(department.id, { name, description })
  }, [department.id, name, description, onUpdate])

  const toggleSkill = useCallback(
    (slug: string) => {
      const next = selectedSkills.includes(slug)
        ? selectedSkills.filter((s) => s !== slug)
        : [...selectedSkills, slug]
      setSelectedSkills(next)
      onUpdate(department.id, { skillSlugs: next })
    },
    [department.id, selectedSkills, onUpdate]
  )

  const toggleMcp = useCallback(
    (name: string) => {
      const next = selectedMcp.includes(name)
        ? selectedMcp.filter((s) => s !== name)
        : [...selectedMcp, name]
      setSelectedMcp(next)
      onUpdate(department.id, { mcpServerNames: next })
    },
    [department.id, selectedMcp, onUpdate]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Department Config</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">Name</Label>
          <Input
            id="dept-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dept-desc">Description</Label>
          <Textarea
            id="dept-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            rows={3}
          />
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <Label>Skills</Label>
          {availableSkills.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No skills installed. Install skills from the Skills Market.
            </p>
          ) : (
            <div className="space-y-1.5">
              {availableSkills.map((skill) => (
                <label
                  key={skill.slug}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedSkills.includes(skill.slug)}
                    onCheckedChange={() => toggleSkill(skill.slug)}
                  />
                  {skill.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* MCP Servers */}
        <div className="space-y-2">
          <Label>MCP Servers</Label>
          {availableMcp.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No MCP servers registered. Add them in Agent X.
            </p>
          ) : (
            <div className="space-y-1.5">
              {availableMcp.map((server) => (
                <label
                  key={server.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedMcp.includes(server.name)}
                    onCheckedChange={() => toggleMcp(server.name)}
                  />
                  {server.name}
                  {server.description && (
                    <span className="text-muted-foreground text-xs">
                      — {server.description}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(department.id)}
        >
          <Trash2Icon className="mr-1 h-3.5 w-3.5" />
          Delete Department
        </Button>
      </div>
    </div>
  )
}
