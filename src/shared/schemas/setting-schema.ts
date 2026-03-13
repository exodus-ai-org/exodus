import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

// Optional URL field: treats empty string as null before URL validation,
// so clearing a Base URL field doesn't trigger a validation error.
const optionalUrl = z
  .string()
  .nullable()
  .transform((val) => (val === '' || val == null ? null : val))
  .pipe(z.string().url().nullable())

export const ProviderConfigSchema = z.object({
  provider: z.string().nullable(),
  chatModel: z.string().nullable(),
  reasoningModel: z.string().nullable(),
  embeddingModel: z.string().nullable(),
  maxSteps: z.number().nonnegative().lte(100).nullable()
})

export const ProvidersSchema = z.object({
  openaiApiKey: z.string().nullable(),
  openaiBaseUrl: optionalUrl,
  azureOpenaiApiKey: z.string().nullable(),
  azureOpenAiEndpoint: optionalUrl,
  azureOpenAiApiVersion: z.string().nullable(),
  anthropicApiKey: z.string().nullable(),
  anthropicBaseUrl: optionalUrl,
  googleGeminiApiKey: z.string().nullable(),
  googleGeminiBaseUrl: optionalUrl,
  xAiApiKey: z.string().nullable(),
  xAiBaseUrl: optionalUrl,
  ollamaBaseUrl: z.string().nullable()
})

export const AudioSchema = z.object({
  speechToTextModel: z.string().nullable(),
  textToSpeechVoice: z.string().nullable(),
  textToSpeechModel: z.string().nullable()
})

export const GoogleCloudSchema = z.object({
  googleApiKey: z.string().nullable()
})

export const UrlToMarkdownProvider = z.enum(['default', 'jina', 'cloudflare'])
export type UrlToMarkdownProvider = z.infer<typeof UrlToMarkdownProvider>

export const WebSearchSchema = z.object({
  braveApiKey: z.string().nullish(),
  country: z.string().nullish(),
  language: z.string().nullish(),
  urlToMarkdownProvider: UrlToMarkdownProvider.nullish(),
  cloudflareAccountId: z.string().nullish(),
  cloudflareApiToken: z.string().nullish()
})

export const ImageSchema = z.object({
  model: z.string().nullable(),
  size: z.string().nullable(),
  quality: z.string().nullable(),
  outputFormat: z.string().nullable(),
  generatedCounts: z.number().nonnegative().lte(10).nullable(),
  background: z.string().nullable()
})

export const DeepResearchSchema = z.object({
  breadth: z.number().gte(3).lte(10).nullable(),
  depth: z.number().gte(1).lte(5).nullable()
})

export const S3Schema = z
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

export const ToolsSchema = z.object({
  disabledTools: z.array(z.string())
})

export const SettingSchema = z.object({
  id: z.string(),
  providerConfig: ProviderConfigSchema.nullable(),
  providers: ProvidersSchema.nullable(),
  // ARCHIVED: mcpServers: z.string(),
  tools: ToolsSchema.nullable(),
  audio: AudioSchema.nullable(),
  assistantAvatar: z.string(),
  googleCloud: GoogleCloudSchema.nullable(),
  webSearch: WebSearchSchema.nullable(),
  image: ImageSchema.nullable(),
  deepResearch: DeepResearchSchema.nullable(),
  s3: S3Schema.nullable(),
  createdAt: z.any(),
  updatedAt: z.any()
})

export type Setting = z.infer<typeof SettingSchema>

export type UseFormReturnType = UseFormReturn<Setting>
