import type { InferUITool, UIMessage } from 'ai'
import { weather } from 'src/main/lib/ai/calling-tools/weather'
import z from 'zod'

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
}

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>

export interface Attachment {
  name: string
  url: string
  contentType: string
}
