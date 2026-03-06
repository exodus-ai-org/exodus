import { serve, ServerType } from '@hono/node-server'
import { SERVER_PORT } from '@shared/constants/systems'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectMcpServers } from '../ai/mcp'
import { getSetting } from '../db/queries'
import { errorHandler } from './middlewares'
import audioRouter from './routes/audio'
import chatRouter from './routes/chat'
import dbIoRouter from './routes/db-io'
import deepResearchRouter from './routes/deep-research'
import historyRouter from './routes/history'
import ragRouter from './routes/rag'
import s3UploaderRouter from './routes/s3-uploader'
import settingsRouter from './routes/setting'
import toolsRouter from './routes/tools'
import workflowRouter from './routes/workflow'

// Export server functions
export async function connectHttpServer() {
  console.log('⏳ Registering MCP servers...')
  const start = performance.now()
  const tools = await connectMcpServers()
  const end = performance.now()
  console.log(
    '✅ All of the MCP servers have been registered in',
    end - start,
    'ms'
  )

  let server: ServerType | null = null
  const app = new Hono<{ Variables: Variables }>()

  // Middleware
  app.use('*', cors())

  // Add setting to context for all routes (except setting route to avoid circular dependency)
  app.use('/api/*', async (c, next) => {
    // Get fresh setting on each request to ensure it's always up-to-date
    const setting = await getSetting()
    c.set('setting', setting)
    await next()
  })

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
  app.route('/api/setting', settingsRouter)
  app.route('/api/audio', audioRouter)
  app.route('/api/db-io', dbIoRouter)
  app.route('/api/deep-research', deepResearchRouter)
  app.route('/api/tools', toolsRouter)
  app.route('/api/rag', ragRouter)
  app.route('/api/workflow', workflowRouter)
  app.route('/api/s3', s3UploaderRouter)

  // Ping
  app.get('/', (c) => c.text('Exodus is running.'))

  // Global error handler
  app.onError(errorHandler)

  return {
    close(callback?: (err?: Error) => void) {
      if (server) server.close(callback)
    },
    start() {
      server = serve({
        fetch: app.fetch,
        port: SERVER_PORT
      })
      console.log('✅ Hono is running on', SERVER_PORT)
    }
  }
}
