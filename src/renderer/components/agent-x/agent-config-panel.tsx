import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { AgentData } from '@/stores/agent-x'
import { Trash2Icon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface AgentConfigPanelProps {
  agent: AgentData
  onUpdate: (id: string, data: Partial<AgentData>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function AgentConfigPanel({
  agent,
  onUpdate,
  onDelete,
  onClose
}: AgentConfigPanelProps) {
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? '')
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt ?? '')
  const [toolAllowList, setToolAllowList] = useState(
    (agent.toolAllowList ?? []).join(', ')
  )
  const [isActive, setIsActive] = useState(agent.isActive ?? true)

  useEffect(() => {
    setName(agent.name)
    setDescription(agent.description ?? '')
    setSystemPrompt(agent.systemPrompt ?? '')
    setToolAllowList((agent.toolAllowList ?? []).join(', '))
    setIsActive(agent.isActive ?? true)
  }, [agent])

  const handleSave = useCallback(() => {
    const tools = toolAllowList
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onUpdate(agent.id, {
      name,
      description,
      systemPrompt,
      toolAllowList: tools,
      isActive
    })
  }, [
    agent.id,
    name,
    description,
    systemPrompt,
    toolAllowList,
    isActive,
    onUpdate
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Agent Config</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-desc">Description</Label>
          <Textarea
            id="agent-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
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
              onUpdate(agent.id, { isActive: checked })
            }}
          />
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDelete(agent.id)}
        >
          <Trash2Icon className="mr-1 h-3.5 w-3.5" />
          Delete Agent
        </Button>
      </div>
    </div>
  )
}
