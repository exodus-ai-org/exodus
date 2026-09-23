import { MCP_HOMEPAGE } from '@exodus/shared/constants/external-urls'
import {
  ChevronDownIcon,
  CloudIcon,
  Loader2Icon,
  PencilIcon,
  PlugIcon,
  PlusIcon,
  TerminalIcon,
  Trash2Icon,
  XIcon
} from 'lucide-react'
import { lazy, Suspense, useCallback, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { sileo } from 'sileo'
import useSWR from 'swr'

import Markdown from '@/components/markdown'

const CodeEditor = lazy(() =>
  import('@/components/code-editor.js').then((m) => ({
    default: m.StandaloneCodeEditor
  }))
)
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { maskUrlSecrets } from '@/lib/mask-url'
import { cn } from '@/lib/utils'
import {
  createMcpServerApi,
  deleteMcpServerApi,
  getMcpServers,
  type McpServerItem,
  type McpTransportType,
  updateMcpServerApi
} from '@/services/mcp-service'

import {
  ENTER_UP,
  SettingsEmpty,
  SettingsIntro,
  SettingsItem,
  staggerDelay
} from '../settings-kit'
import { SettingsRow, SettingsSection } from '../settings-row'
import { SettingsSelect } from '../settings-select'

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
    // Merge extra config last so it can supplement or override standard fields
    if (s.extraConfig && Object.keys(s.extraConfig).length > 0)
      Object.assign(obj[s.name], s.extraConfig)
  }
  return JSON.stringify({ mcpServers: obj }, null, 2)
}

// ─── Intro Notice ────────────────────────────────────────────────────────────

export function McpIntroNotice() {
  return (
    <Trans ns="settings" i18nKey="mcpServers.intro">
      Register{' '}
      <a
        href={MCP_HOMEPAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline"
      >
        MCP
      </a>{' '}
      servers (local or remote), then toggle the switch to enable their tools in
      chat.
    </Trans>
  )
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
  const { t } = useTranslation('settings')
  const [expanded, setExpanded] = useState(false)
  const isActive = server.isActive ?? false
  const isRemote = server.transportType !== 'stdio'

  return (
    <SettingsItem
      className={ENTER_UP}
      icon={isRemote ? <CloudIcon /> : <TerminalIcon />}
      title={
        <>
          <span className="truncate">{server.name}</span>
          {tools.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {t('mcpServers.serverCard.toolCount', { count: tools.length })}
            </Badge>
          )}
        </>
      }
      description={
        <p className="truncate font-mono text-xs">
          {isRemote
            ? maskUrlSecrets(server.url ?? '')
            : `${server.command} ${(server.args ?? []).join(' ')}`}
        </p>
      }
      actions={
        <>
          <Switch checked={isActive} onCheckedChange={onToggle} />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('mcpServers.serverCard.editAria')}
            onClick={onEdit}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t('mcpServers.serverCard.deleteAria')}
            onClick={onDelete}
          >
            <Trash2Icon />
          </Button>
        </>
      }
    >
      {(server.description || tools.length > 0) && (
        // Lined up under the name, past the icon tile.
        <div className="flex min-w-0 flex-col items-start gap-2 pl-[54px]">
          {server.description && (
            <p className="text-muted-foreground text-xs">
              {server.description}
            </p>
          )}
          {tools.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground -ml-2.5"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDownIcon
                className={cn(
                  'transition-transform duration-200',
                  !expanded && '-rotate-90'
                )}
              />
              {expanded
                ? t('mcpServers.serverCard.hideTools')
                : t('mcpServers.serverCard.showTools')}
            </Button>
          )}
          {expanded && (
            // Stretched, not `items-start`: a long description has to wrap
            // inside the card rather than size the list to its own width.
            <div className="flex w-full min-w-0 flex-col gap-1.5 self-stretch break-words">
              {tools.map((tool, index) => (
                <div
                  key={tool.name}
                  className={cn('flex min-w-0 flex-col', ENTER_UP)}
                  style={staggerDelay(index)}
                >
                  <p className="font-mono text-xs font-medium">{tool.name}</p>
                  {tool.description && (
                    <div className="[&_.markdown]:text-muted-foreground [&_.markdown]:text-[11px] [&_.markdown]:leading-snug [&_.markdown_li]:leading-normal [&_.markdown_ol]:mb-0.5 [&_.markdown_ul]:mb-0.5">
                      <Markdown src={tool.description} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SettingsItem>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function McpServers() {
  const { t } = useTranslation(['common', 'settings'])
  const { data: servers, mutate } = useSWR<McpServerItem[]>(
    '/api/v1/mcp',
    getMcpServers
  )
  const { data: toolsData, mutate: mutateTools } = useSWR<{
    tools: McpToolsGroup[]
  }>('/api/v1/mcp/tools')

  const toolsByServer = new Map<string, McpToolInfo[]>()
  for (const group of toolsData?.tools ?? []) {
    toolsByServer.set(group.mcpServerName, group.tools)
  }

  // Form state
  const [editing, setEditing] = useState<McpServerItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  // Removing a server drops its headers and config for good, so it is confirmed.
  const [deleting, setDeleting] = useState<McpServerItem | null>(null)
  const [transportType, setTransportType] = useState<McpTransportType>('stdio')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // stdio
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState<string[]>([])
  // remote
  const [url, setUrl] = useState('')
  const [headersStr, setHeadersStr] = useState('')
  // extra config (arbitrary JSON object)
  const [extraConfigStr, setExtraConfigStr] = useState('{}')

  // JSON (read-only)
  const jsonValue = servers ? serversToJson(servers) : '{}'

  const resetForm = useCallback(() => {
    setEditing(null)
    setIsNew(false)
    setTransportType('stdio')
    setName('')
    setDescription('')
    setCommand('')
    setArgs([])
    setUrl('')
    setHeadersStr('')
    setExtraConfigStr('{}')
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
    setArgs(server.args ?? [])
    setUrl(server.url ?? '')
    setHeadersStr(server.headers ? JSON.stringify(server.headers, null, 2) : '')
    setExtraConfigStr(
      server.extraConfig && Object.keys(server.extraConfig).length > 0
        ? JSON.stringify(server.extraConfig, null, 2)
        : '{}'
    )
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
          sileo.error({ title: t('settings:mcpServers.toast.invalidHeaders') })
          setSaving(false)
          return
        }
      }

      let parsedExtraConfig: Record<string, unknown> | null = null
      const trimmedExtra = extraConfigStr.trim()
      if (trimmedExtra && trimmedExtra !== '{}') {
        try {
          const parsed = JSON.parse(trimmedExtra)
          if (
            typeof parsed !== 'object' ||
            Array.isArray(parsed) ||
            parsed === null
          ) {
            throw new Error(t('settings:mcpServers.toast.mustBeJsonObject'))
          }
          parsedExtraConfig = parsed
        } catch (e) {
          sileo.error({
            title: t('settings:mcpServers.toast.invalidExtraConfig'),
            description:
              e instanceof Error
                ? e.message
                : t('settings:mcpServers.toast.mustBeJsonObject')
          })
          setSaving(false)
          return
        }
      }

      const data: Partial<McpServerItem> & { name: string } = {
        name: name.trim(),
        description: description.trim() || null,
        transportType,
        extraConfig: parsedExtraConfig
      }

      if (transportType === 'stdio') {
        data.command = command.trim()
        data.args = args.map((a) => a.trim()).filter(Boolean)
        data.env = null
      } else {
        data.url = url.trim()
        data.headers = parsedHeaders
      }

      if (editing) {
        await updateMcpServerApi(editing.id, data)
        sileo.success({
          title: t('settings:mcpServers.toast.updated', { name: data.name })
        })
      } else {
        await createMcpServerApi(data)
        sileo.success({
          title: t('settings:mcpServers.toast.registered', {
            name: data.name
          }),
          description: t('settings:mcpServers.toast.disabledByDefault')
        })
      }
      await refresh()
      resetForm()
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t('settings:mcpServers.toast.operationFailed')
      sileo.error({
        title: editing
          ? t('settings:mcpServers.toast.updateFailed')
          : t('settings:mcpServers.toast.registerFailed'),
        description: msg
      })
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
    extraConfigStr,
    editing,
    refresh,
    resetForm,
    t
  ])

  const handleDelete = useCallback(
    async (server: McpServerItem) => {
      try {
        await deleteMcpServerApi(server.id)
        sileo.success({
          title: t('settings:mcpServers.toast.removed', { name: server.name })
        })
        await refresh()
        if (editing?.id === server.id) resetForm()
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : t('settings:mcpServers.toast.operationFailed')
        sileo.error({
          title: t('settings:mcpServers.toast.removeFailed'),
          description: msg
        })
      }
    },
    [editing, refresh, resetForm, t]
  )

  const handleToggle = useCallback(
    async (server: McpServerItem) => {
      const enabling = !server.isActive
      try {
        await updateMcpServerApi(server.id, { isActive: enabling })
        await refresh()
        if (enabling) {
          sileo.success({
            title: t('settings:mcpServers.toast.enabled', {
              name: server.name
            })
          })
        } else {
          sileo.success({
            title: t('settings:mcpServers.toast.disabled', {
              name: server.name
            })
          })
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : t('settings:mcpServers.toast.operationFailed')
        sileo.error({
          title: t('settings:mcpServers.toast.toggleFailed'),
          description: msg
        })
      }
    },
    [refresh, t]
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
    <div className="flex flex-col gap-8">
      <SettingsIntro>
        <p>
          <McpIntroNotice />
          {activeCount > 0 && (
            <span className="ml-1 tabular-nums">
              <Trans
                ns="settings"
                i18nKey="mcpServers.activeSummary"
                values={{ totalToolCount, activeCount }}
              >
                Currently <strong>{totalToolCount} tools</strong> from{' '}
                <strong>{activeCount} servers</strong> active.
              </Trans>
            </span>
          )}
        </p>
      </SettingsIntro>

      <Tabs defaultValue="form">
        <TabsList className="w-full">
          <TabsTrigger value="form" className="flex-1">
            {t('settings:mcpServers.tabs.servers')}
          </TabsTrigger>
          <TabsTrigger value="json" className="flex-1">
            {t('settings:mcpServers.tabs.json')}
          </TabsTrigger>
        </TabsList>

        {/* ── Form Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="form" className="mt-6">
          <div className="flex flex-col gap-8">
            {!showForm && (
              <SettingsSection>
                <SettingsItem
                  icon={<PlugIcon />}
                  title={t('settings:mcpServers.addCard.title')}
                  description={t('settings:mcpServers.addCard.description')}
                  actions={
                    <Button onClick={startNew}>
                      <PlusIcon />
                      {t('settings:mcpServers.form.addServerButton')}
                    </Button>
                  }
                />
              </SettingsSection>
            )}

            {!showForm && servers && (
              <SettingsSection title={t('settings:mcpServers.tabs.servers')}>
                {list.length === 0 ? (
                  <SettingsEmpty
                    icon={PlugIcon}
                    title={t('settings:mcpServers.empty')}
                    description={t('settings:mcpServers.emptyHint')}
                  />
                ) : (
                  list.map((server) => (
                    <ServerCard
                      key={server.id}
                      server={server}
                      tools={toolsByServer.get(server.name) ?? []}
                      onToggle={() => handleToggle(server)}
                      onEdit={() => startEdit(server)}
                      onDelete={() => setDeleting(server)}
                    />
                  ))
                )}
              </SettingsSection>
            )}

            {showForm && (
              <SettingsSection
                title={
                  editing
                    ? t('settings:mcpServers.form.updateButton')
                    : t('settings:mcpServers.form.registerButton')
                }
              >
                <SettingsRow
                  label={t('settings:mcpServers.form.transport.label')}
                  description={t(
                    'settings:mcpServers.form.transport.description'
                  )}
                  layout="vertical"
                >
                  <SettingsSelect
                    value={transportType}
                    onValueChange={(v) =>
                      setTransportType(v as McpTransportType)
                    }
                    options={[
                      {
                        value: 'stdio',
                        label: t(
                          'settings:mcpServers.form.transport.options.stdio'
                        )
                      },
                      {
                        value: 'streamable-http',
                        label: t(
                          'settings:mcpServers.form.transport.options.streamableHttp'
                        )
                      },
                      {
                        value: 'sse',
                        label: t(
                          'settings:mcpServers.form.transport.options.sse'
                        )
                      }
                    ]}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings:mcpServers.form.name.label')}
                  description={t('settings:mcpServers.form.name.description')}
                  layout="vertical"
                >
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. filesystem"
                  />
                </SettingsRow>

                {transportType === 'stdio' ? (
                  <>
                    <SettingsRow
                      label={t('settings:mcpServers.form.command.label')}
                      description={t(
                        'settings:mcpServers.form.command.description'
                      )}
                      layout="vertical"
                    >
                      <Input
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="e.g. npx -y @modelcontextprotocol/server-filesystem"
                      />
                    </SettingsRow>
                    <SettingsRow
                      label={t('settings:mcpServers.form.args.label')}
                      description={t(
                        'settings:mcpServers.form.args.description'
                      )}
                      layout="vertical"
                    >
                      <div className="flex flex-col gap-2">
                        {args.map((arg, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={arg}
                              onChange={(e) =>
                                setArgs((prev) =>
                                  prev.map((a, j) =>
                                    j === i ? e.target.value : a
                                  )
                                )
                              }
                              placeholder={
                                i === 0
                                  ? 'e.g. -y'
                                  : 'e.g. @modelcontextprotocol/server-filesystem'
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() =>
                                setArgs((prev) =>
                                  prev.filter((_, j) => j !== i)
                                )
                              }
                              aria-label={t(
                                'settings:mcpServers.form.args.removeAria',
                                { index: i + 1 }
                              )}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="self-start"
                          onClick={() => setArgs((prev) => [...prev, ''])}
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          {t('settings:mcpServers.form.args.addButton')}
                        </Button>
                      </div>
                    </SettingsRow>
                  </>
                ) : (
                  <>
                    <SettingsRow
                      label={t('settings:mcpServers.form.url.label')}
                      description={t(
                        'settings:mcpServers.form.url.description',
                        {
                          protocol: transportType === 'sse' ? 'SSE' : 'HTTP'
                        }
                      )}
                      layout="vertical"
                    >
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="e.g. https://mcp.example.com/sse"
                      />
                    </SettingsRow>
                    <SettingsRow
                      label={t('settings:mcpServers.form.headers.label')}
                      description={t(
                        'settings:mcpServers.form.headers.description'
                      )}
                      layout="vertical"
                    >
                      <Input
                        value={headersStr}
                        onChange={(e) => setHeadersStr(e.target.value)}
                        placeholder='{"Authorization": "Bearer token"}'
                        className="font-mono text-xs"
                      />
                    </SettingsRow>
                  </>
                )}

                <SettingsRow
                  label={t('settings:mcpServers.form.description.label')}
                  description={t(
                    'settings:mcpServers.form.description.description'
                  )}
                  layout="vertical"
                >
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(
                      'settings:mcpServers.form.description.placeholder'
                    )}
                  />
                </SettingsRow>

                <SettingsRow
                  label={t('settings:mcpServers.form.extraConfig.label')}
                  description={t(
                    'settings:mcpServers.form.extraConfig.description'
                  )}
                  layout="vertical"
                >
                  <div className="border-border overflow-hidden rounded-md border">
                    <Suspense
                      fallback={
                        <div className="flex h-32 items-center justify-center">
                          <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
                        </div>
                      }
                    >
                      <CodeEditor
                        className="h-32"
                        value={extraConfigStr}
                        onChange={setExtraConfigStr}
                        monacoEditorOption={{
                          language: 'json',
                          lineNumbers: 'off',
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          folding: false
                        }}
                      />
                    </Suspense>
                  </div>
                </SettingsRow>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={resetForm}
                  >
                    {t('action.cancel')}
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
                    {editing
                      ? t('settings:mcpServers.form.updateButton')
                      : t('settings:mcpServers.form.registerButton')}
                  </Button>
                </div>
              </SettingsSection>
            )}
          </div>
        </TabsContent>

        {/* ── JSON Tab (read-only) ───────────────────────────────────── */}
        <TabsContent value="json" className="mt-6">
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              {t('settings:mcpServers.json.description')}
            </p>
            <div className="border-border overflow-hidden rounded-lg border">
              <Suspense
                fallback={
                  <div className="flex h-80 items-center justify-center">
                    <Loader2Icon className="text-muted-foreground h-5 w-5 animate-spin" />
                  </div>
                }
              >
                <CodeEditor
                  className="h-80"
                  value={jsonValue}
                  monacoEditorOption={{ readOnly: true }}
                />
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings:mcpServers.deleteDialog.title', {
                name: deleting?.name ?? ''
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:mcpServers.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const server = deleting
                setDeleting(null)
                if (server) void handleDelete(server)
              }}
            >
              {t('settings:mcpServers.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
