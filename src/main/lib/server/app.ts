import bodyParser from 'body-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import { Server } from 'http'
import audioRouter from './routes/audio'
import chatRouter, { connectMcpServers } from './routes/chat'
import historyRouter from './routes/history'
import ollamaRouter from './routes/ollama'
import settingRouter from './routes/setting'

export async function connectHttpServer() {
  console.log('⏳ Registering MCP servers...')
  const tools = await connectMcpServers()
  console.log('✅ MCP servers have been registered.')

  let server: Server | null = null
  const app = express()

  app.use(cors())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use('/api/chat', (req: Request, res: Response, next: NextFunction) => {
    req.body = { ...req.body, tools }
    next()
  })
  app.use('/api/chat', chatRouter)
  app.use('/api/history', historyRouter)
  app.use('/api/setting', settingRouter)
  app.use('/api/ollama', ollamaRouter)
  app.use('/api/audio', audioRouter)

  app.get('/ping', (req, res) => {
    res.send('pong')
  })

  return {
    close() {
      if (server) server.close()
    },
    start() {
      server = app.listen(8964)
      console.log('✅ Express http server is running on 8964.')
    }
  }
}
