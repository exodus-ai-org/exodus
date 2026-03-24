import {
  ChevronDownIcon,
  CloudIcon,
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  TerminalIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

import CodeEditor from '@/components/code-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createMcpServerApi,
  deleteMcpServerApi,
  getMcpServers,
  type McpServerItem,
  type McpTransportType,
  updateMcpServerApi
} from '@/services/mcp-service'

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

// ─── JSON serialisation (read-only view) ────────────────────────────────────

function serversToJson(servers: McpServerItem[]): string {
  const obj: Record<string, Record<string, unknown>> = {}
  for (const s of servers) {
    if (s.transportType === 'stdio') {
      obj[s.name] = { command: s.command }
      if (s.args?.length) obj[s.name].args = s.args
      if (s.env && Object.keys(s.env).length > 0) obj[s.name].env = s.env
    } else {
      obj[s.name] = { transport: s.transportType, url: s.url }
      if (s.headers && Object.keys(s.headers).length > 0)
        obj[s.name].headers = s.headers
    }
  }
  return JSON.stringify({ mcpServers: obj }, null, 2)
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
  const isRemote = server.transportType !== 'stdio'

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isRemote ? (
              <CloudIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            ) : (
              <TerminalIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            )}
            <p className="truncate text-sm font-medium">{server.name}</p>
            {tools.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {tools.length} tool{tools.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate pl-5.5 font-mono text-xs">
            {isRemote
              ? server.url
              : `${server.command} ${(server.args ?? []).join(' ')}`}
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
      {server.description && (
        <p className="text-muted-foreground p-3 pt-0 text-xs">
          {server.description}
        </p>
      )}
      {tools.length > 0 && (
        <>
          <Button
            variant="ghost"
            className="text-muted-foreground flex w-full items-center justify-start gap-1 rounded-none border-t px-3 py-1.5 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
            {expanded ? 'Hide tools' : 'Show tools'}
          </Button>
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

  const toolsByServer = new Map<string, McpToolInfo[]>()
  for (const group of toolsData?.tools ?? []) {
    toolsByServer.set(group.mcpServerName, group.tools)
  }

  // Form state
  const [editing, setEditing] = useState<McpServerItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [transportType, setTransportType] = useState<McpTransportType>('stdio')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // stdio
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  // remote
  const [url, setUrl] = useState('')
  const [headersStr, setHeadersStr] = useState('')

  // JSON (read-only)
  const jsonValue = servers ? serversToJson(servers) : '{}'

  const resetForm = useCallback(() => {
    setEditing(null)
    setIsNew(false)
    setTransportType('stdio')
    setName('')
    setDescription('')
    setCommand('')
    setArgs('')
    setUrl('')
    setHeadersStr('')
  }, [])

  const startNew = useCallback(() => {
    resetForm()
    setIsNew(true)
  }, [resetForm])

  const startEdit = useCallback((server: McpServerItem) => {
    setEditing(server)
    setIsNew(false)
    setTransportType(server.transportType ?? 'stdio')
    setName(server.name)
    setDescription(server.description ?? '')
    setCommand(server.command ?? '')
    setArgs((server.args ?? []).join(' '))
    setUrl(server.url ?? '')
    setHeadersStr(server.headers ? JSON.stringify(server.headers, null, 2) : '')
  }, [])

  const refresh = useCallback(async () => {
    await mutate()
    await mutateTools()
  }, [mutate, mutateTools])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    if (transportType === 'stdio' && !command.trim()) return
    if (transportType !== 'stdio' && !url.trim()) return
    setSaving(true)
    try {
      let parsedHeaders: Record<string, string> | null = null
      if (headersStr.trim()) {
        try {
          parsedHeaders = JSON.parse(headersStr)
        } catch {
          toast.error('Invalid headers JSON')
          setSaving(false)
          return
        }
      }

      const data: Partial<McpServerItem> & { name: string } = {
        name: name.trim(),
        description: description.trim() || null,
        transportType
      }

      if (transportType === 'stdio') {
        data.command = command.trim()
        data.args = args.trim().split(/\s+/).filter(Boolean)
        data.env = null
      } else {
        data.url = url.trim()
        data.headers = parsedHeaders
      }

      if (editing) {
        await updateMcpServerApi(editing.id, data)
        toast.success(`"${data.name}" updated — reconnecting…`)
      } else {
        await createMcpServerApi(data)
        toast.success(`"${data.name}" registered (disabled by default)`)
      }
      await refresh()
      resetForm()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Operation failed'
      toast.error(
        editing
          ? `Failed to update server: ${msg}`
          : `Failed to register: ${msg}`
      )
    } finally {
      setSaving(false)
    }
  }, [
    name,
    description,
    transportType,
    command,
    args,
    url,
    headersStr,
    editing,
    refresh,
    resetForm
  ])

  const handleDelete = useCallback(
    async (server: McpServerItem) => {
      try {
        await deleteMcpServerApi(server.id)
        toast.success(`"${server.name}" removed — connection closed`)
        await refresh()
        if (editing?.id === server.id) resetForm()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Operation failed'
        toast.error(`Failed to remove server: ${msg}`)
      }
    },
    [editing, refresh, resetForm]
  )

  const handleToggle = useCallback(
    async (server: McpServerItem) => {
      const enabling = !server.isActive
      try {
        await updateMcpServerApi(server.id, { isActive: enabling })
        await refresh()
        if (enabling) {
          toast.success(`"${server.name}" enabled — reconnecting…`)
        } else {
          toast.success(`"${server.name}" disabled — connection closed`)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Operation failed'
        toast.error(`Failed to toggle server: ${msg}`)
      }
    },
    [refresh]
  )

  const showForm = isNew || editing !== null
  const list = servers ?? []
  const activeCount = list.filter((s) => s.isActive).length
  const totalToolCount = (toolsData?.tools ?? []).reduce(
    (acc, g) => acc + g.tools.length,
    0
  )

  const canSave =
    name.trim() && (transportType === 'stdio' ? command.trim() : url.trim())

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
          servers (local or remote), then toggle the switch to enable their
          tools in chat.
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
                  label="Transport"
                  description="How to connect to the MCP server"
                  layout="vertical"
                >
                  <Select
                    value={transportType}
                    onValueChange={(v) =>
                      setTransportType(v as McpTransportType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(val: string) =>
                          ({
                            stdio: 'Stdio (Local Command)',
                            'streamable-http': 'Streamable HTTP (Remote)',
                            sse: 'SSE (Remote Legacy)'
                          })[val] ?? val
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectGroup>
                        <SelectItem value="stdio">
                          Stdio (Local Command)
                        </SelectItem>
                        <SelectItem value="streamable-http">
                          Streamable HTTP (Remote)
                        </SelectItem>
                        <SelectItem value="sse">SSE (Remote Legacy)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>

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

                {transportType === 'stdio' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <SettingRow
                      label="URL"
                      description={`The ${transportType === 'sse' ? 'SSE' : 'HTTP'} endpoint URL of the remote server`}
                      layout="vertical"
                    >
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="e.g. https://mcp.example.com/sse"
                      />
                    </SettingRow>
                    <SettingRow
                      label="Headers"
                      description='Optional auth/custom headers as JSON, e.g. {"Authorization":"Bearer ..."}'
                      layout="vertical"
                    >
                      <Input
                        value={headersStr}
                        onChange={(e) => setHeadersStr(e.target.value)}
                        placeholder='{"Authorization": "Bearer token"}'
                        className="font-mono text-xs"
                      />
                    </SettingRow>
                  </>
                )}

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
                    disabled={!canSave || saving}
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

        {/* ── JSON Tab (read-only) ───────────────────────────────────── */}
        <TabsContent value="json" className="mt-4">
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              Read-only view of current configuration. Use the Servers tab to
              make changes.
            </p>
            <div className="border-border overflow-hidden rounded-lg border">
              <CodeEditor
                className="h-80"
                value={jsonValue}
                monacoEditorOption={{ readOnly: true }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
