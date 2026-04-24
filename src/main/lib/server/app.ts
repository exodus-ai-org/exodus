import { serve, ServerType } from '@hono/node-server'
import { SERVER_PORT } from '@shared/constants/systems'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ARCHIVED: import { connectMcpServers } from '../ai/mcp'
import { initScheduler } from '../ai/agent-x/scheduler'
import { getSettings } from '../db/queries'
import { logger } from '../logger'
import { errorHandler } from './middlewares'
import agentXRouter, { emitToAll } from './routes/agent-x'
import artifactsRouter from './routes/artifacts'
import audioRouter from './routes/audio'
import backupRouter from './routes/backup'
import chatRouter from './routes/chat'
import dbIoRouter from './routes/db-io'
import deepResearchRouter from './routes/deep-research'
import historyRouter from './routes/history'
import logsRouter from './routes/logs'
import mcpRouter from './routes/mcp'
import memoryRouter from './routes/memory'
import projectRouter from './routes/project'
import s3UploaderRouter from './routes/s3-uploader'
import settingsRouter from './routes/settings'
import skillsRouter from './routes/skills'
import toolsRouter from './routes/tools'
import usageRouter from './routes/usage'

// Export server functions
export async function connectHttpServer() {
  // ARCHIVED: MCP server connection removed
  // const tools = await connectMcpServers()

  let server: ServerType | null = null
  const app = new Hono<{ Variables: Variables }>()

  // Middleware
  app.use('*', cors())

  // Add setting to context for all routes (except setting route to avoid circular dependency)
  app.use('/api/*', async (c, next) => {
    // Get fresh settings on each request to ensure it's always up-to-date
    const settings = await getSettings()
    c.set('settings', settings)
    await next()
  })

  // ARCHIVED: MCP tools middleware removed
  // app.use('/api/chat/*', async (c, next) => {
  //   if (tools !== null) { c.set('tools', tools) }
  //   await next()
  // })

  // Routes
  app.route('/api/chat', chatRouter)
  app.route('/api/history', historyRouter)
  app.route('/api/project', projectRouter)
  app.route('/api/settings', settingsRouter)
  app.route('/api/audio', audioRouter)
  app.route('/api/db-io', dbIoRouter)
  app.route('/api/deep-research', deepResearchRouter)
  app.route('/api/tools', toolsRouter)
  app.route('/api/agent-x', agentXRouter)
  app.route('/api/s3', s3UploaderRouter)
  app.route('/api/skills', skillsRouter)
  app.route('/api/mcp', mcpRouter)
  app.route('/api/memory', memoryRouter)
  app.route('/api/usage', usageRouter)
  app.route('/api/logs', logsRouter)
  app.route('/api/backup', backupRouter)
  app.route('/api/artifacts', artifactsRouter)

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
      logger.info('server', 'Hono is running', { port: SERVER_PORT })

      // Initialize cron scheduler after server is up
      initScheduler(emitToAll).catch((err) =>
        logger.error('scheduler', 'Init error', { error: String(err) })
      )
    }
  }
}
