import type { InferUITool, UIMessage } from 'ai'
import type { weather } from 'src/main/lib/ai/calling-tools/weather'
import { z } from 'zod'

export type DataPart = { type: 'append-message'; message: string }

export const messageMetadataSchema = z.object({
  createdAt: z.string()
})

export type MessageMetadata = z.infer<typeof messageMetadataSchema>

type weatherTool = InferUITool<typeof weather>

export type ChatTools = {
  getWeather: weatherTool
}

export type CustomUIDataTypes = {
  textDelta: string
  imageDelta: string
  sheetDelta: string
  codeDelta: string
  appendMessage: string
  id: string
  title: string
  clear: null
  finish: null
  'chat-title': string
}

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>

export type Attachment = {
  name: string
  url: string
  contentType: string
}
