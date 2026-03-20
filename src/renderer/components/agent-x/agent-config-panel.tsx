import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { AgentData } from '@/stores/agent-x'
import { Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface AgentConfigPanelProps {
  agent: AgentData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: Partial<AgentData>) => void
  onDelete: (id: string) => void
}

export function AgentConfigPanel({
  agent,
  open,
  onOpenChange,
  onUpdate,
  onDelete
}: AgentConfigPanelProps) {
  // Keep last valid agent so the Sheet can animate out with content
  const lastAgentRef = useRef(agent)
  if (agent) lastAgentRef.current = agent
  const displayAgent = agent ?? lastAgentRef.current

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [toolAllowList, setToolAllowList] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description ?? '')
      setSystemPrompt(agent.systemPrompt ?? '')
      setToolAllowList((agent.toolAllowList ?? []).join(', '))
      setIsActive(agent.isActive ?? true)
    }
  }, [agent])

  const handleSave = useCallback(() => {
    if (!displayAgent) return
    const tools = toolAllowList
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onUpdate(displayAgent.id, {
      name,
      description,
      systemPrompt,
      toolAllowList: tools,
      isActive
    })
  }, [
    displayAgent,
    name,
    description,
    systemPrompt,
    toolAllowList,
    isActive,
    onUpdate
  ])

  if (!displayAgent) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Agent Config</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-desc">Description</Label>
            <Textarea
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-prompt">System Prompt</Label>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={handleSave}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-tools">
              Tool Allow List{' '}
              <span className="text-muted-foreground font-normal">
                (comma-separated, empty = all)
              </span>
            </Label>
            <Input
              id="agent-tools"
              value={toolAllowList}
              onChange={(e) => setToolAllowList(e.target.value)}
              onBlur={handleSave}
              placeholder="webSearch, writeFile"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="agent-active">Active</Label>
            <Switch
              id="agent-active"
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked)
                onUpdate(displayAgent.id, { isActive: checked })
              }}
            />
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onDelete(displayAgent.id)}
          >
            <Trash2Icon data-icon className="mr-1 size-3.5" />
            Delete Agent
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
