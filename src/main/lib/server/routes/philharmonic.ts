import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import philharmonicConversations from './philharmonic-conversations'
import philharmonicCrud from './philharmonic-crud'
import philharmonicSse from './philharmonic-sse'

export { emitToAll, emitToTask, emitToConversation } from './philharmonic-sse'

const philharmonic = new Hono<{ Variables: Variables }>()

philharmonic.route('/', philharmonicCrud)
philharmonic.route('/', philharmonicSse)
philharmonic.route('/', philharmonicConversations)

export default philharmonic
