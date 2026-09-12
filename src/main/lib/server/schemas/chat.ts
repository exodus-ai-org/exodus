import { EffortLevelSchema } from '@shared/schemas/settings-schema'
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

// For all messages (permissive — handles user, assistant, toolResult). Must be
// `looseObject`, not `object`: the chat route echoes the parsed history back to
// the renderer in the `done` SSE event, so a plain `object` (which drops
// unknown keys) would strip `details`/`toolCallId`/`toolName`/`isError` off
// every prior turn's messages — e.g. a webSearch turn would lose its citation
// sources the moment the next turn's `done` frame lands.
const messageSchema = z.looseObject({
  id: z.string(),
  role: z.string(),
  content: z.any()
})

export const postRequestBodySchema = z.object({
  id: z.uuid('v4'),
  // Either a single new message or all messages (for tool approvals)
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema),
  advancedTools: z.array(z.enum(AdvancedTools)),
  reasoningEffort: EffortLevelSchema.optional(),
  projectId: z.string().uuid().optional()
})

export type PostRequestBody = z.infer<typeof postRequestBodySchema>
