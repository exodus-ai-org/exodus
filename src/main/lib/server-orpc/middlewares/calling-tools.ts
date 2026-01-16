import { os } from '@orpc/server'
import { McpTools } from '@shared/types/ai'
import { connectMcpServers } from '../../ai/mcp'

let cachedTools: McpTools[] | null = null

export const withCallingTools = os.middleware(async ({ context, next }) => {
  if (!cachedTools) {
    console.log('⏳ Registering MCP servers...')
    const start = performance.now()
    cachedTools = await connectMcpServers()
    const end = performance.now()
    console.log(
      '✅ All of the MCP servers have been registered in',
      end - start,
      'ms'
    )
  }

  return next({
    context: {
      ...context,
      tools: cachedTools
    }
  })
})
