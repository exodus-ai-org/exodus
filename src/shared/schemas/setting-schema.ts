import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

export const providerConfigSchema = z.object({
  provider: z.string().nullable(),
  chatModel: z.string().nullable(),
  reasoningModel: z.string().nullable(),
  embeddingModel: z.string().nullable(),
  maxSteps: z.number().nonnegative().lte(100).nullable()
})

export const providersSchema = z.object({
  openaiApiKey: z.string().nullable(),
  openaiBaseUrl: z.string().url().nullable(),
  azureOpenaiApiKey: z.string().nullable(),
  azureOpenAiEndpoint: z.string().url().nullable(),
  azureOpenAiApiVersion: z.string().nullable(),
  anthropicApiKey: z.string().nullable(),
  anthropicBaseUrl: z.string().url().nullable(),
  googleGeminiApiKey: z.string().nullable(),
  googleGeminiBaseUrl: z.string().url().nullable(),
  xAiApiKey: z.string().nullable(),
  xAiBaseUrl: z.string().url().nullable(),
  ollamaBaseUrl: z.string().nullable()
})

export const audioSchema = z.object({
  speechToTextModel: z.string().nullable(),
  textToSpeechVoice: z.string().nullable(),
  textToSpeechModel: z.string().nullable()
})

export const googleCloudSchema = z.object({
  googleApiKey: z.string().nullable()
})

export const webSearchSchema = z.object({
  serperApiKey: z.string().nullable(),
  country: z.string().nullable(),
  language: z.string().nullable()
})

export const imageSchema = z.object({
  model: z.string().nullable(),
  size: z.string().nullable(),
  quality: z.string().nullable(),
  outputFormat: z.string().nullable(),
  generatedCounts: z.number().nonnegative().lte(10).nullable(),
  background: z.string().nullable()
})

export const deepResearchSchema = z.object({
  breadth: z.number().gte(3).lte(10).nullable(),
  depth: z.number().gte(1).lte(5).nullable()
})

export const mem0Schema = z.object({
  enable: z.boolean().nullable(),
  apiKey: z.string().nullable(),
  userName: z.string().nullable()
})

export const s3Schema = z
  .object({
    region: z.string().nullable(),
    bucket: z.string().nullable(),
    accessKeyId: z.string().nullable(),
    secretAccessKey: z.string().nullable()
  })
  .superRefine((val, ctx) => {
    const fields = [
      'region',
      'bucket',
      'accessKeyId',
      'secretAccessKey'
    ] as const

    const values = fields.map((f) => val[f])
    const filledCount = values.filter(
      (v) => v !== null && v.trim() !== ''
    ).length

    if (filledCount === 0) return
    if (filledCount === fields.length) return

    fields.forEach((f) => {
      if (val[f] === null) {
        ctx.addIssue({
          path: [f],
          code: z.ZodIssueCode.custom,
          message: 'S3 配置需要一次性填写完整'
        })
      }
    })
  })

export const settingSchema = z.object({
  id: z.string(),
  providerConfig: providerConfigSchema.nullable(),
  providers: providersSchema.nullable(),
  mcpServers: z.string(),
  audio: audioSchema.nullable(),
  assistantAvatar: z.string(),
  googleCloud: googleCloudSchema.nullable(),
  webSearch: webSearchSchema.nullable(),
  image: imageSchema.nullable(),
  deepResearch: deepResearchSchema.nullable(),
  mem0: mem0Schema.nullable(),
  s3: s3Schema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Setting = z.infer<typeof settingSchema>

export type UseFormReturnType = UseFormReturn<Setting>
