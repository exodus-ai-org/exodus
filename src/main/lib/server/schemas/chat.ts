import { AdvancedTools } from '@shared/types/ai'
import { Chat } from '@shared/types/db'
import { z } from 'zod'

// Chat routes schemas
export const createChatSchema = z.object({
  id: z.string(),
  messages: z.array(z.any()),
  advancedTools: z.array(z.enum(AdvancedTools))
})

export const updateChatSchema = z.custom<Chat>()

// pi-ai user message content
const textContentSchema = z.object({
  type: z.literal('text'),
  text: z.string()
})

const imageContentSchema = z.object({
  type: z.literal('image'),
  data: z.string(),
  mimeType: z.string()
})

const userContentSchema = z.union([textContentSchema, imageContentSchema])

const userMessageSchema = z.object({
  id: z.uuid('v4'),
  role: z.literal('user'),
  content: z.union([z.string(), z.array(userContentSchema)])
})

// For all messages (more permissive schema - handles user, assistant, toolResult)
const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.any()
})

export const postRequestBodySchema = z.object({
  id: z.uuid('v4'),
  // Either a single new message or all messages (for tool approvals)
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema),
  advancedTools: z.array(z.enum(AdvancedTools))
})

export type PostRequestBody = z.infer<typeof postRequestBodySchema>
