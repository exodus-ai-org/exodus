import { fetcher } from '@shared/utils/http'

const BASE = '/api/mcp'

export interface McpServerItem {
  id: string
  name: string
  description: string | null
  command: string
  args: string[]
  env: Record<string, string> | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
}

export const getMcpServers = () => fetcher<McpServerItem[]>(BASE)

export const createMcpServerApi = (
  data: Partial<McpServerItem> & { name: string; command: string }
) => fetcher<McpServerItem>(BASE, { method: 'POST', body: data as never })

export const updateMcpServerApi = (id: string, data: Partial<McpServerItem>) =>
  fetcher<McpServerItem>(`${BASE}/${id}`, {
    method: 'PUT',
    body: data as never
  })

export const deleteMcpServerApi = (id: string) =>
  fetcher<string>(`${BASE}/${id}`, { method: 'DELETE' })
