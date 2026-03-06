import { AdvancedTools } from '@shared/types/ai'
import { Chat } from '@shared/types/db'
import { UIMessage } from 'ai'
import { z } from 'zod'

// Chat routes schemas
export const createChatSchema = z.object({
  id: z.string(),
  messages: z.array(z.custom<UIMessage>()),
  advancedTools: z.array(z.enum(AdvancedTools))
})

export const updateChatSchema = z.custom<Chat>()

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000)
})

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png']),
  name: z.string().min(1).max(100),
  url: z.string().url()
})

const partSchema = z.union([textPartSchema, filePartSchema])

const userMessageSchema = z.object({
  id: z.uuid('v4'),
  role: z.enum(['user']),
  parts: z.array(partSchema)
})

// For tool approval flows, we accept all messages (more permissive schema)
const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(z.any())
})

export const postRequestBodySchema = z.object({
  id: z.uuid('v4'),
  // Either a single new message or all messages (for tool approvals)
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema),
  advancedTools: z.array(z.enum(AdvancedTools))
})

export type PostRequestBody = z.infer<typeof postRequestBodySchema>
