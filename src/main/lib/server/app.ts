import { serve, ServerType } from '@hono/node-server'
import { SERVER_PORT } from '@shared/constants'
import { Variables } from '@shared/types/ai'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import audioRouter from './routes/audio'
import chatRouter, { connectMcpServers } from './routes/chat'
import historyRouter from './routes/history'
import ollamaRouter from './routes/ollama'
import settingRouter from './routes/setting'

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

  // Ping
  app.get('/', (c) => c.text('Exodus is running.'))

  return {
    close(callback?: (err?: Error) => void) {
      if (server) server.close(callback)
    },
    start() {
      server = serve({
        fetch: app.fetch,
        port: SERVER_PORT
      })
      console.log(`✅ Hono http server is running on ${SERVER_PORT}.`)
    }
  }
}
