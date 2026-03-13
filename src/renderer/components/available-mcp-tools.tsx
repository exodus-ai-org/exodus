// ARCHIVED: MCP tools display removed. Agent capabilities now come from built-in tools + Skills.
//
// import { HammerIcon } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Dialog, DialogContent, ... } from '@/components/ui/dialog'
// import { McpTools } from '@shared/types/ai'
// import useSWR from 'swr'
// ...
//
// export function AvailableMcpTools() {
//   const { data } = useSWR<{ tools: McpTools[] }>('/api/chat/mcp')
//   const count = data?.tools?.reduce(...) ?? 0
//   if (count === 0) return null
//   return <Dialog>...</Dialog>
// }

export function AvailableMcpTools() {
  return null
}
