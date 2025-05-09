import { JSONRPCMessage } from 'ai'
import { v4 as uuidV4 } from 'uuid'
import { saveDeepResearchMessage } from '../../db/queries'

export async function sendSseMessage({
  controller,
  deepResearchId,
  payload
}: {
  controller: ReadableStreamDefaultController
  deepResearchId: string
  payload: string
}) {
  const message: JSONRPCMessage = {
    jsonrpc: '2.0',
    method: 'message/deep-research',
    params: { payload }
  }

  await saveDeepResearchMessage({
    id: uuidV4(),
    deepResearchId,
    message,
    createdAt: new Date()
  })

  const encodedData = `data: ${JSON.stringify({ message })}\n\n`
  controller.enqueue(new TextEncoder().encode(encodedData))
}
