import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { sileo } from 'sileo'

import { i18n } from '@/lib/i18n'
import {
  createMcpServerApi,
  deleteMcpServerApi,
  getMcpServers,
  getMcpTools,
  type McpServerItem,
  updateMcpServerApi
} from '@/services/mcp-service'

const MCP_ROOT = ['mcp'] as const

export const mcpKeys = {
  all: MCP_ROOT,
  servers: [...MCP_ROOT, 'servers'] as const,
  tools: [...MCP_ROOT, 'tools'] as const
}

// A server change can change its tools, so every write marks both leaves.
// Returned, not voided: the mutation then settles after the mounted lists have
// re-read, and the form the caller closes on success never lands on a stale
// list. A failed re-read still resolves (reported by the query cache).
const refreshMcp = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: mcpKeys.all })

export function useMcpServers() {
  const { data, isLoading } = useQuery({
    queryKey: mcpKeys.servers,
    queryFn: () => getMcpServers()
  })
  return { data, isLoading }
}

// One key for the settings page and the composer's dialog: a single read.
export function useMcpTools() {
  const { data, isLoading } = useQuery({
    queryKey: mcpKeys.tools,
    queryFn: () => getMcpTools()
  })
  return { data, isLoading }
}

export function useCreateMcpServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createMcpServerApi>[0]) =>
      createMcpServerApi(data),
    // The global mutation handler is the only error surface — a local catch
    // and toast would make one failed write toast twice.
    meta: { errorTitle: i18n.t('settings:mcpServers.toast.registerFailed') },
    onSuccess: (_server, data) => {
      sileo.success({
        title: i18n.t('settings:mcpServers.toast.registered', {
          name: data.name
        }),
        description: i18n.t('settings:mcpServers.toast.disabledByDefault')
      })
      return refreshMcp(queryClient)
    }
  })
}

export function useUpdateMcpServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: Partial<McpServerItem> & { name: string }
    }) => updateMcpServerApi(id, data),
    meta: { errorTitle: i18n.t('settings:mcpServers.toast.updateFailed') },
    onSuccess: (_server, { data }) => {
      sileo.success({
        title: i18n.t('settings:mcpServers.toast.updated', { name: data.name })
      })
      return refreshMcp(queryClient)
    }
  })
}

export function useDeleteMcpServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (server: Pick<McpServerItem, 'id' | 'name'>) =>
      deleteMcpServerApi(server.id),
    meta: { errorTitle: i18n.t('settings:mcpServers.toast.removeFailed') },
    onSuccess: (_void, server) => {
      sileo.success({
        title: i18n.t('settings:mcpServers.toast.removed', {
          name: server.name
        })
      })
      return refreshMcp(queryClient)
    }
  })
}

// Its own hook rather than an update of `{ isActive }`: the copy names the
// direction (enabled / disabled), not "updated". The variable is the server as
// it is now; the write flips it.
export function useToggleMcpServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (server: Pick<McpServerItem, 'id' | 'name' | 'isActive'>) =>
      updateMcpServerApi(server.id, { isActive: !server.isActive }),
    meta: { errorTitle: i18n.t('settings:mcpServers.toast.toggleFailed') },
    onSuccess: (_server, server) => {
      sileo.success({
        title: i18n.t(
          server.isActive
            ? 'settings:mcpServers.toast.disabled'
            : 'settings:mcpServers.toast.enabled',
          { name: server.name }
        )
      })
      return refreshMcp(queryClient)
    }
  })
}
