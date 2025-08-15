import { AdvancedTools } from '@shared/types/ai'
import { Chat, Settings } from '@shared/types/db'
import { UIMessage } from 'ai'
import { z } from 'zod'

// Chat routes schemas
export const createChatSchema = z.object({
  id: z.string(),
  messages: z.array(z.custom<UIMessage>()),
  advancedTools: z.array(z.nativeEnum(AdvancedTools))
})

export const updateChatSchema = z.custom<Chat>()

// Tools routes schemas
export const markdownToPdfSchema = z.object({
  markdown: z.string()
})

// Settings routes schemas
export const updateSettingsSchema = z.custom<Settings>()

// Audio routes schemas
export const speechSchema = z.object({
  text: z.string()
})

// Deep Research routes schemas
export const createDeepResearchSchema = z.object({
  deepResearchId: z.string(),
  query: z.string()
})

// DB IO routes schemas
export const importDataSchema = z.object({
  tableName: z.string(),
  file: z.instanceof(File)
})

// Custom Uploader routes schemas
export const customUploaderResponseSchema = z.array(
  z.object({
    name: z.string(),
    url: z.string(),
    contentType: z.string()
  })
)
