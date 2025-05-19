import { serve, ServerType } from '@hono/node-server'
import { SERVER_PORT } from '@shared/constants/systems'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectMcpServers } from '../ai/mcp'
import audioRouter from './routes/audio'
import chatRouter from './routes/chat'
import customUploaderRouter from './routes/custom-uploader'
import dbIoRouter from './routes/db-io'
import deepResearchRouter from './routes/deep-research'
import historyRouter from './routes/history'
import settingsRouter from './routes/settings'
import toolsRouter from './routes/tools'

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
  app.route('/api/settings', settingsRouter)
  app.route('/api/audio', audioRouter)
  app.route('/api/custom-uploader', customUploaderRouter)
  app.route('/api/db-io', dbIoRouter)
  app.route('/api/deep-research', deepResearchRouter)
  app.route('/api/tools', toolsRouter)

  // Ping
  app.get('/', (c) => c.text('Exodus is running.'))

  app.onError((err, c) => {
    return c.json(
      {
        success: false,
        message: err.message || 'Internal Server Error'
      },
      500
    )
  })

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
