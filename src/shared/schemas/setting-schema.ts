import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

// Optional URL: nullish input, validates as URL only when non-empty.
// No transform so input/output types stay identical (no RHF type mismatch).
const optionalUrl = z
  .string()
  .nullish()
  .refine(
    (val) => {
      if (val == null || val === '') return true
      return z.string().url().safeParse(val).success
    },
    { message: 'Invalid URL' }
  )

export const ProviderConfigSchema = z.object({
  provider: z.string().nullish(),
  chatModel: z.string().nullish(),
  reasoningModel: z.string().nullish(),
  embeddingModel: z.string().nullish(),
  maxSteps: z.number().nonnegative().lte(100).nullish()
})

export const ProvidersSchema = z.object({
  openaiApiKey: z.string().nullish(),
  openaiBaseUrl: optionalUrl,
  azureOpenaiApiKey: z.string().nullish(),
  azureOpenAiEndpoint: optionalUrl,
  azureOpenAiApiVersion: z.string().nullish(),
  anthropicApiKey: z.string().nullish(),
  anthropicBaseUrl: optionalUrl,
  googleGeminiApiKey: z.string().nullish(),
  googleGeminiBaseUrl: optionalUrl,
  xAiApiKey: z.string().nullish(),
  xAiBaseUrl: optionalUrl,
  ollamaBaseUrl: z.string().nullish()
})

export const AudioSchema = z.object({
  speechToTextModel: z.string().nullish(),
  textToSpeechVoice: z.string().nullish(),
  textToSpeechModel: z.string().nullish()
})

export const GoogleCloudSchema = z.object({
  googleApiKey: z.string().nullish()
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
  model: z.string().nullish(),
  size: z.string().nullish(),
  quality: z.string().nullish(),
  outputFormat: z.string().nullish(),
  generatedCounts: z.number().nonnegative().lte(10).nullish(),
  background: z.string().nullish()
})

export const DeepResearchSchema = z.object({
  breadth: z.number().gte(3).lte(10).nullish(),
  depth: z.number().gte(1).lte(5).nullish()
})

export const S3Schema = z
  .object({
    region: z.string().nullish(),
    bucket: z.string().nullish(),
    accessKeyId: z.string().nullish(),
    secretAccessKey: z.string().nullish()
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
      (v) => v != null && v.trim() !== ''
    ).length

    if (filledCount === 0) return
    if (filledCount === fields.length) return

    fields.forEach((f) => {
      if (val[f] == null) {
        ctx.addIssue({
          path: [f],
          code: z.ZodIssueCode.custom,
          message: 'S3 配置需要一次性填写完整'
        })
      }
    })
  })

export const ToolsSchema = z.object({
  disabledTools: z.array(z.string()).default([])
})

export const SettingSchema = z.object({
  id: z.string(),
  providerConfig: ProviderConfigSchema.nullish(),
  providers: ProvidersSchema.nullish(),
  mcpServers: z.string().nullish(),
  tools: ToolsSchema.nullish(),
  audio: AudioSchema.nullish(),
  assistantAvatar: z.string().nullish(),
  googleCloud: GoogleCloudSchema.nullish(),
  webSearch: WebSearchSchema.nullish(),
  image: ImageSchema.nullish(),
  deepResearch: DeepResearchSchema.nullish(),
  s3: S3Schema.nullish(),
  autoUpdate: z.boolean().nullish(),
  createdAt: z.any(),
  updatedAt: z.any()
})

export type Setting = z.infer<typeof SettingSchema>

export type SettingInput = z.input<typeof SettingSchema>

export type UseFormReturnType = UseFormReturn<SettingInput>
