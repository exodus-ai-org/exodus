import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import agentXCrud from './agent-x-crud'
import agentXSse from './agent-x-sse'

export { emitToAll, emitToTask } from './agent-x-sse'

const agentX = new Hono<{ Variables: Variables }>()

agentX.route('/', agentXCrud)
agentX.route('/', agentXSse)

export default agentX
