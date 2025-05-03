import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

export const providerConfigSchema = z.object({
  provider: z.string().nullish(),
  chatModel: z.string().nullish(),
  reasoningModel: z.string().nullish(),
  maxSteps: z.coerce.number().nonnegative().lte(100).nullish()
})

export const providersSchema = z.object({
  openaiApiKey: z.string().nullish(),
  openaiBaseUrl: z.union([z.string().url().nullish(), z.literal('')]),
  azureOpenaiApiKey: z.string().nullish(),
  azureOpenAiEndpoint: z.union([z.string().url().nullish(), z.literal('')]),
  azureOpenAiApiVersion: z.string().nullish(),
  anthropicApiKey: z.string().nullish(),
  anthropicBaseUrl: z.union([z.string().url().nullish(), z.literal('')]),
  googleGeminiApiKey: z.string().nullish(),
  googleGeminiBaseUrl: z.union([z.string().url().nullish(), z.literal('')]),
  xAiApiKey: z.string().nullish(),
  xAiBaseUrl: z.union([z.string().url().nullish(), z.literal('')]),
  ollamaBaseUrl: z.string().nullish()
})

export const audioSchema = z.object({
  speechToTextModel: z.string().nullish(),
  textToSpeechVoice: z.string().nullish(),
  textToSpeechModel: z.string().nullish()
})

export const googleCloudSchema = z.object({
  googleApiKey: z.string().nullish()
})

export const webSearchSchema = z.object({
  serperApiKey: z.string().nullish(),
  country: z.string().nullish(),
  language: z.string().nullish()
})

export const imageSchema = z.object({
  model: z.string().nullish(),
  size: z.string().nullish(),
  quality: z.string().nullish(),
  outputFormat: z.string().nullish(),
  generatedCounts: z.coerce.number().nonnegative().lte(10).nullish(),
  background: z.string().nullish()
})

export const settingsSchema = z.object({
  providerConfig: providerConfigSchema.nullish(),
  providers: providersSchema.nullish(),
  mcpServers: z.string().nullish(),
  audio: audioSchema.nullish(),
  fileUploadEndpoint: z.string().nullish(),
  assistantAvatar: z.string().nullish(),
  googleCloud: googleCloudSchema.nullish(),
  webSearch: webSearchSchema.nullish(),
  image: imageSchema.nullish()
})

export type SettingsType = z.infer<typeof settingsSchema>

export type UseFormReturnType = UseFormReturn<z.infer<typeof settingsSchema>>
