import { createOpenAI } from '@ai-sdk/openai'
import { experimental_createMCPClient, streamText } from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'
import bodyParser from 'body-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { Request, Response } from 'express'
import { Server } from 'http'
import { mcpServerConfigs } from '../ai/mcp-server'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
})

export async function connectHttpServer() {
  const transport = new Experimental_StdioMCPTransport({
    command: 'node',
    args: mcpServerConfigs.mcpServers['obsidian-mcp'].args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  const tools = await mcpClient.tools()

  let server: Server = null
  const app = express()

  app.use(cors())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.get('/', function (req: Request, res: Response) {
    res.json({
      hello: 'world'
    })
  })

  app.post('/api/chat', async (req: Request, res: Response) => {
    const result = streamText({
      model: openai('gpt-4o'),
      system:
        'You are a friendly assistant! Keep your responses concise and helpful.',
      messages: req.body.messages,
      maxSteps: 100,
      tools
    })

    result.pipeDataStreamToResponse(res)
  })

  return {
    close() {
      if (server) server.close()
    },
    start() {
      server = app.listen(8964)
    }
  }
}
