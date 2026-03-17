import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  createMcpServerApi,
  deleteMcpServerApi,
  getMcpServers,
  type McpServerItem,
  updateMcpServerApi
} from '@/services/mcp-service'
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { SettingSection } from '../setting-row'

export function McpServers() {
  const { data: servers, mutate } = useSWR<McpServerItem[]>(
    '/api/mcp',
    getMcpServers
  )

  const [editing, setEditing] = useState<McpServerItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [isActive, setIsActive] = useState(true)

  const resetForm = useCallback(() => {
    setEditing(null)
    setIsNew(false)
    setName('')
    setDescription('')
    setCommand('')
    setArgs('')
    setIsActive(true)
  }, [])

  const startNew = useCallback(() => {
    resetForm()
    setIsNew(true)
  }, [resetForm])

  const startEdit = useCallback((server: McpServerItem) => {
    setEditing(server)
    setIsNew(false)
    setName(server.name)
    setDescription(server.description ?? '')
    setCommand(server.command)
    setArgs((server.args ?? []).join(' '))
    setIsActive(server.isActive ?? true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim() || !command.trim()) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        command: command.trim(),
        args: args.trim().split(/\s+/).filter(Boolean),
        env: null
      }

      if (editing) {
        await updateMcpServerApi(editing.id, { ...data, isActive })
        toast.success(`"${data.name}" updated`)
      } else {
        await createMcpServerApi(data)
        toast.success(`"${data.name}" registered`)
      }
      await mutate()
      resetForm()
    } catch (e) {
      const msg = editing
        ? 'Failed to update server'
        : 'Failed to register server'
      toast.error(msg)
      console.error(e)
    } finally {
      setSaving(false)
    }
  }, [name, description, command, args, isActive, editing, mutate, resetForm])

  const handleDelete = useCallback(
    async (server: McpServerItem) => {
      try {
        await deleteMcpServerApi(server.id)
        toast.success(`"${server.name}" removed`)
        await mutate()
        if (editing?.id === server.id) resetForm()
      } catch (e) {
        toast.error('Failed to remove server')
        console.error(e)
      }
    },
    [editing, mutate, resetForm]
  )

  const handleToggle = useCallback(
    async (server: McpServerItem) => {
      try {
        await updateMcpServerApi(server.id, { isActive: !server.isActive })
        await mutate()
      } catch (e) {
        toast.error('Failed to toggle server')
        console.error(e)
      }
    },
    [mutate]
  )

  const showForm = isNew || editing !== null
  const list = servers ?? []

  return (
    <SettingSection>
      {/* Server list */}
      {list.length === 0 && !showForm && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No MCP servers registered. Add one to get started.
        </p>
      )}

      {!showForm &&
        list.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {s.command} {(s.args ?? []).join(' ')}
              </p>
            </div>
            <Switch
              checked={s.isActive ?? true}
              onCheckedChange={() => handleToggle(s)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => startEdit(s)}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive h-7 w-7"
              onClick={() => handleDelete(s)}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

      {/* Add / Edit form */}
      {showForm && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. filesystem"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-desc">Description</Label>
            <Input
              id="mcp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-cmd">Command</Label>
            <Input
              id="mcp-cmd"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. npx -y @modelcontextprotocol/server-filesystem"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-args">
              Args{' '}
              <span className="text-muted-foreground font-normal">
                (space-separated)
              </span>
            </Label>
            <Input
              id="mcp-args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. /Users/me/Documents"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={!name.trim() || !command.trim() || saving}
            >
              {saving && (
                <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              {editing ? 'Update' : 'Register'}
            </Button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={startNew}>
            <PlusIcon className="mr-1 h-3.5 w-3.5" />
            Register MCP Server
          </Button>
        </div>
      )}
    </SettingSection>
  )
}
