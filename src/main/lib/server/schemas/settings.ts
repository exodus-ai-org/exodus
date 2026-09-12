import { Settings } from '@shared/schemas/settings-schema'
import { AiProviders } from '@shared/types/ai'
import z from 'zod'

// Settings routes schemas
export const updateSettingsSchema = z.custom<Settings>()

export const listModelsRequestSchema = z.object({
  provider: z.enum(AiProviders),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  apiVersion: z.string().optional()
})
