import { SERVER_PORT } from '@exodus/shared/constants/systems'
import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { initScheduler } from '../ai/philharmonic/scheduler'
import { getSettings } from '../db/queries'
import { initJobQueue } from '../jobs/worker'
import { logger } from '../logger'
import { errorHandler, lockGate, traceMiddleware } from './middlewares'
import analyticsRouter from './routes/analytics'
import artifactsRouter from './routes/artifacts'
import audioRouter from './routes/audio'
import backupRouter from './routes/backup'
import chatRouter from './routes/chat'
import computerUseRouter from './routes/computer-use'
import dbIoRouter from './routes/db-io'
import deepResearchRouter from './routes/deep-research'
import discoverRouter from './routes/discover'
import historyRouter from './routes/history'
import knowledgeBaseRouter from './routes/knowledge-base'
import lcmStatusRouter from './routes/lcm-status'
import logsRouter from './routes/logs'
import mcpRouter from './routes/mcp'
import memoryRouter from './routes/memory'
import philharmonicRouter, { emitToAll } from './routes/philharmonic'
import projectRouter from './routes/project'
import s3UploaderRouter from './routes/s3-uploader'
import settingsRouter from './routes/settings'
import skillsRouter from './routes/skills'
import toolsRouter from './routes/tools'
import usageRouter from './routes/usage'
import { Variables } from './types'

// Export server functions
export async function connectHttpServer() {
  let server: ServerType | null = null
  const app = new Hono<{ Variables: Variables }>()

  // Middleware
  app.use('*', cors())

  // Lock gate: reject all API access while the app is locked (423).
  app.use('/api/*', lockGate)

  // Trace gate: wrap each request in an AsyncLocalStorage trace so every
  // logger.* call while handling it shares one traceId; echo it as x-trace-id.
  app.use('/api/*', traceMiddleware)

  // Add setting to context for all routes (except setting route to avoid circular dependency)
  app.use('/api/*', async (c, next) => {
    // Get fresh settings on each request to ensure it's always up-to-date
    const settings = await getSettings()
    c.set('settings', settings)
    await next()
  })

  // Routes — every business endpoint lives under one version prefix so a
  // breaking change can ship as /api/v2 next to it instead of on top of it.
  // Clients (the renderer, tests/api, exodus-ios) address /api/v1/....
  const v1 = new Hono<{ Variables: Variables }>()
  v1.route('/chat', chatRouter)
  v1.route('/lcm', lcmStatusRouter)
  v1.route('/history', historyRouter)
  v1.route('/knowledge-base', knowledgeBaseRouter)
  v1.route('/project', projectRouter)
  v1.route('/settings', settingsRouter)
  v1.route('/skills', skillsRouter)
  v1.route('/audio', audioRouter)
  v1.route('/db-io', dbIoRouter)
  v1.route('/deep-research', deepResearchRouter)
  v1.route('/discover', discoverRouter)
  v1.route('/computer-use', computerUseRouter)
  v1.route('/tools', toolsRouter)
  v1.route('/philharmonic', philharmonicRouter)
  v1.route('/s3', s3UploaderRouter)
  v1.route('/mcp', mcpRouter)
  v1.route('/memory', memoryRouter)
  v1.route('/usage', usageRouter)
  v1.route('/logs', logsRouter)
  v1.route('/backup', backupRouter)
  v1.route('/artifacts', artifactsRouter)
  v1.route('/analytics', analyticsRouter)
  app.route('/api/v1', v1)

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
      initJobQueue()
    }
  }
}
