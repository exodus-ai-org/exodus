import { Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getAvailableSkills } from '@/services/agent-x'
import { getMcpServers, type McpServerItem } from '@/services/mcp-service'
import type { DepartmentData } from '@/stores/agent-x'

interface DepartmentConfigPanelProps {
  department: DepartmentData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: Partial<DepartmentData>) => void
  onDelete: (id: string) => void
}

export function DepartmentConfigPanel({
  department,
  open,
  onOpenChange,
  onUpdate,
  onDelete
}: DepartmentConfigPanelProps) {
  // Keep last valid department so the Sheet can animate out with content
  const lastDeptRef = useRef(department)
  if (department) lastDeptRef.current = department
  const displayDept = department ?? lastDeptRef.current

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedMcp, setSelectedMcp] = useState<string[]>([])

  // Available options
  const [availableSkills, setAvailableSkills] = useState<
    Array<{ slug: string; name: string }>
  >([])
  const [availableMcp, setAvailableMcp] = useState<McpServerItem[]>([])

  useEffect(() => {
    getAvailableSkills().then(setAvailableSkills)
    getMcpServers().then(setAvailableMcp)
  }, [])

  useEffect(() => {
    if (department) {
      setName(department.name)
      setDescription(department.description ?? '')
      setSelectedSkills(department.skillSlugs ?? [])
      setSelectedMcp(department.mcpServerNames ?? [])
    }
  }, [department])

  const handleSave = useCallback(() => {
    if (!displayDept) return
    onUpdate(displayDept.id, { name, description })
  }, [displayDept, name, description, onUpdate])

  const toggleSkill = useCallback(
    (slug: string) => {
      if (!displayDept) return
      const next = selectedSkills.includes(slug)
        ? selectedSkills.filter((s) => s !== slug)
        : [...selectedSkills, slug]
      setSelectedSkills(next)
      onUpdate(displayDept.id, { skillSlugs: next })
    },
    [displayDept, selectedSkills, onUpdate]
  )

  const toggleMcp = useCallback(
    (name: string) => {
      if (!displayDept) return
      const next = selectedMcp.includes(name)
        ? selectedMcp.filter((s) => s !== name)
        : [...selectedMcp, name]
      setSelectedMcp(next)
      onUpdate(displayDept.id, { mcpServerNames: next })
    },
    [displayDept, selectedMcp, onUpdate]
  )

  if (!displayDept) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Department Config</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-2">
            <Label>Skills</Label>
            {availableSkills.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No skills installed. Install skills from the Skills Market.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {availableSkills.map((skill) => (
                  <Label key={skill.slug}>
                    <Checkbox
                      checked={selectedSkills.includes(skill.slug)}
                      onCheckedChange={() => toggleSkill(skill.slug)}
                    />
                    {skill.name}
                  </Label>
                ))}
              </div>
            )}
          </div>

          {/* MCP Servers */}
          <div className="flex flex-col gap-2">
            <Label>MCP Servers</Label>
            {availableMcp.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No MCP servers registered. Add them in Agent X.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {availableMcp.map((server) => (
                  <div key={server.id} className="flex flex-col gap-0.5">
                    <Label>
                      <Checkbox
                        checked={selectedMcp.includes(server.name)}
                        onCheckedChange={() => toggleMcp(server.name)}
                      />
                      {server.name}
                    </Label>
                    {server.description && (
                      <p className="text-muted-foreground pl-6 text-xs">
                        {server.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onDelete(displayDept.id)}
          >
            <Trash2Icon data-icon className="mr-1 size-3.5" />
            Delete Department
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
