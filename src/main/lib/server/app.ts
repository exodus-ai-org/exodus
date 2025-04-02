import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import audioRouter from './routes/audio'
import chatRouter, { connectMcpServers } from './routes/chat'
import historyRouter from './routes/history'
import ollamaRouter from './routes/ollama'
import settingRouter from './routes/setting'
import { Variables } from './types'

// Export server functions
export async function connectHttpServer() {
  console.log('⏳ Registering MCP servers...')
  const tools = await connectMcpServers()
  console.log('✅ MCP servers have been registered.')

  let server: ServerType | null = null
  const app = new Hono<{ Variables: Variables }>()

  // Middleware
  app.use('*', cors())

  // Add tools to context
  app.use('/api/chat/*', async (c, next) => {
    if (tools !== null) {
      c.set('tools', tools)
    }

    await next()
  })

  // Routes
  app.route('/api/chat', chatRouter)
  app.route('/api/history', historyRouter)
  app.route('/api/setting', settingRouter)
  app.route('/api/ollama', ollamaRouter)
  app.route('/api/audio', audioRouter)

  app.get('/ping', (c) => c.text('pong'))

  return {
    close() {
      if (server) server.close()
    },
    start() {
      server = serve({
        fetch: app.fetch,
        port: 8964
      })
      console.log('✅ Hono http server is running on 8964.')
    }
  }
}
