import CodeEditor from '@/components/code-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createMcpServerApi,
  deleteMcpServerApi,
  getMcpServers,
  type McpServerItem,
  updateMcpServerApi
} from '@/services/mcp-service'
import {
  ChevronDownIcon,
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { SettingRow, SettingSection } from '../setting-row'

// ─── Types ──────────────────────────────────────────────────────────────────

interface McpToolInfo {
  name: string
  description: string
}

interface McpToolsGroup {
  mcpServerName: string
  tools: McpToolInfo[]
}

// ─── JSON ↔ DB sync helpers ─────────────────────────────────────────────────

function serversToJson(servers: McpServerItem[]): string {
  const obj: Record<
    string,
    { command: string; args?: string[]; env?: Record<string, string> }
  > = {}
  for (const s of servers) {
    obj[s.name] = { command: s.command }
    if (s.args?.length) obj[s.name].args = s.args
    if (s.env && Object.keys(s.env).length > 0) obj[s.name].env = s.env
  }
  return JSON.stringify({ mcpServers: obj }, null, 2)
}

function jsonToServerList(json: string): Array<{
  name: string
  command: string
  args: string[]
  env: Record<string, string> | null
}> {
  const parsed = JSON.parse(json)
  const map = parsed?.mcpServers ?? parsed ?? {}
  return Object.entries(map).map(([name, cfg]) => {
    const c = cfg as {
      command?: string
      args?: string[]
      env?: Record<string, string>
    }
    return {
      name,
      command: c.command ?? '',
      args: c.args ?? [],
      env: c.env ?? null
    }
  })
}

// ─── Server Card with Tools Preview ─────────────────────────────────────────

function ServerCard({
  server,
  tools,
  onToggle,
  onEdit,
  onDelete
}: {
  server: McpServerItem
  tools: McpToolInfo[]
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isActive = server.isActive ?? false

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{server.name}</p>
            {tools.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {tools.length} tool{tools.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {server.command} {(server.args ?? []).join(' ')}
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={onToggle} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-7 w-7"
          onClick={onDelete}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tools preview */}
      {tools.length > 0 && (
        <>
          <button
            className="text-muted-foreground hover:bg-accent/50 flex w-full items-center gap-1 border-t px-3 py-1.5 text-xs transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
            {expanded ? 'Hide tools' : 'Show tools'}
          </button>
          {expanded && (
            <div className="flex flex-col gap-1 px-3 pb-2">
              {tools.map((tool) => (
                <div key={tool.name} className="flex flex-col">
                  <p className="text-xs font-medium">{tool.name}</p>
                  {tool.description && (
                    <p className="text-muted-foreground text-[11px]">
                      {tool.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function McpServers() {
  const { data: servers, mutate } = useSWR<McpServerItem[]>(
    '/api/mcp',
    getMcpServers
  )
  const { data: toolsData, mutate: mutateTools } = useSWR<{
    tools: McpToolsGroup[]
  }>('/api/mcp/tools')

  // Build a map: serverName → tools[]
  const toolsByServer = new Map<string, McpToolInfo[]>()
  for (const group of toolsData?.tools ?? []) {
    toolsByServer.set(group.mcpServerName, group.tools)
  }

  // Form state
  const [editing, setEditing] = useState<McpServerItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')

  // JSON state
  const [jsonValue, setJsonValue] = useState('')
  const [jsonSaving, setJsonSaving] = useState(false)

  useEffect(() => {
    if (servers) setJsonValue(serversToJson(servers))
  }, [servers])

  const resetForm = useCallback(() => {
    setEditing(null)
    setIsNew(false)
    setName('')
    setDescription('')
    setCommand('')
    setArgs('')
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
  }, [])

  const refresh = useCallback(async () => {
    await mutate()
    await mutateTools()
  }, [mutate, mutateTools])

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
        await updateMcpServerApi(editing.id, data)
        toast.success(`"${data.name}" updated`)
      } else {
        await createMcpServerApi(data)
        toast.success(`"${data.name}" registered`)
      }
      await refresh()
      resetForm()
    } catch {
      toast.error(editing ? 'Failed to update server' : 'Failed to register')
    } finally {
      setSaving(false)
    }
  }, [name, description, command, args, editing, refresh, resetForm])

  const handleDelete = useCallback(
    async (server: McpServerItem) => {
      try {
        await deleteMcpServerApi(server.id)
        toast.success(`"${server.name}" removed`)
        await refresh()
        if (editing?.id === server.id) resetForm()
      } catch {
        toast.error('Failed to remove server')
      }
    },
    [editing, refresh, resetForm]
  )

  const handleToggle = useCallback(
    async (server: McpServerItem) => {
      try {
        await updateMcpServerApi(server.id, { isActive: !server.isActive })
        toast.success(
          server.isActive
            ? `"${server.name}" disabled`
            : `"${server.name}" enabled`
        )
        await refresh()
      } catch {
        toast.error('Failed to toggle server')
      }
    },
    [refresh]
  )

  const handleJsonSave = useCallback(async () => {
    setJsonSaving(true)
    try {
      const desired = jsonToServerList(jsonValue)
      const existing = servers ?? []
      for (const s of existing) {
        if (!desired.find((d) => d.name === s.name)) {
          await deleteMcpServerApi(s.id)
        }
      }
      for (const d of desired) {
        const match = existing.find((s) => s.name === d.name)
        if (match) {
          await updateMcpServerApi(match.id, d)
        } else {
          await createMcpServerApi(d)
        }
      }
      await refresh()
      toast.success('MCP configuration saved')
    } catch {
      toast.error('Invalid JSON or failed to save')
    } finally {
      setJsonSaving(false)
    }
  }, [jsonValue, servers, refresh])

  const showForm = isNew || editing !== null
  const list = servers ?? []
  const activeCount = list.filter((s) => s.isActive).length
  const totalToolCount = (toolsData?.tools ?? []).reduce(
    (acc, g) => acc + g.tools.length,
    0
  )

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Register{' '}
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            MCP
          </a>{' '}
          servers, then toggle the switch to enable their tools in chat.
          {activeCount > 0 && (
            <span className="ml-1">
              Currently <strong>{totalToolCount} tools</strong> from{' '}
              <strong>{activeCount} servers</strong> active.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="form">
        <TabsList className="w-full">
          <TabsTrigger value="form" className="flex-1">
            Servers
          </TabsTrigger>
          <TabsTrigger value="json" className="flex-1">
            JSON
          </TabsTrigger>
        </TabsList>

        {/* ── Form Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="form" className="mt-4">
          <SettingSection>
            {list.length === 0 && !showForm && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No MCP servers configured yet.
              </p>
            )}

            {!showForm &&
              list.map((s) => (
                <ServerCard
                  key={s.id}
                  server={s}
                  tools={toolsByServer.get(s.name) ?? []}
                  onToggle={() => handleToggle(s)}
                  onEdit={() => startEdit(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}

            {showForm && (
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <SettingRow
                  label="Name"
                  description="A unique identifier for this server"
                  layout="vertical"
                >
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. filesystem"
                  />
                </SettingRow>
                <SettingRow
                  label="Command"
                  description="The executable command to start the MCP server"
                  layout="vertical"
                >
                  <Input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g. npx -y @modelcontextprotocol/server-filesystem"
                  />
                </SettingRow>
                <SettingRow
                  label="Args"
                  description="Space-separated command arguments"
                  layout="vertical"
                >
                  <Input
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="e.g. /Users/me/Documents"
                  />
                </SettingRow>
                <SettingRow
                  label="Description"
                  description="Optional notes about this server"
                  layout="vertical"
                >
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                  />
                </SettingRow>
                <div className="flex gap-2 pt-1">
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

            {!showForm && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={startNew}>
                  <PlusIcon className="mr-1 h-3.5 w-3.5" />
                  Add Server
                </Button>
              </div>
            )}
          </SettingSection>
        </TabsContent>

        {/* ── JSON Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="json" className="mt-4">
          <div className="flex flex-col gap-3">
            <div className="border-border overflow-hidden rounded-lg border">
              <CodeEditor
                className="h-80"
                value={jsonValue}
                onChange={setJsonValue}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleJsonSave} disabled={jsonSaving}>
                {jsonSaving && (
                  <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
