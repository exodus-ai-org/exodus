import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/node'
import { CORSPlugin } from '@orpc/server/plugins'
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse
} from 'node:http'
import { router } from './routes'

export async function connectOrpcServer() {
  const handler = new RPCHandler(router, {
    plugins: [new CORSPlugin()],
    interceptors: [
      onError((error) => {
        console.error(error)
      })
    ]
  })

  let server: Server<typeof IncomingMessage, typeof ServerResponse>
  server = createServer(async (req, res) => {
    const result = await handler.handle(req, res, {
      context: { headers: req.headers }
    })

    if (!result.matched) {
      res.statusCode = 404
      res.end('No procedure matched')
    }
  })

  return {
    close(callback?: (err?: Error) => void) {
      if (server) server.close(callback)
    },
    start() {
      server = server.listen(63129, '127.0.0.1', () =>
        console.log('✅ Orpc is running on', 63129)
      )
    }
  }
}
