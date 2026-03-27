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
  reasoningModel: z.string().nullish()
  // TODO: RAG / embedding model — will be redesigned
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
  textToSpeechModel: z.string().nullish(),
  textToSpeechSpeed: z.number().min(0.25).max(4.0).nullish(),
  textToSpeechFormat: z.string().nullish(),
  textToSpeechInstructions: z.string().nullish()
})

export const GoogleCloudSchema = z.object({
  googleApiKey: z.string().nullish()
})

// 'jina' = Jina Reader (default), 'builtin' = our cheerio+turndown
export const UrlToMarkdownProvider = z.enum(['jina', 'builtin'])
export type UrlToMarkdownProvider = z.infer<typeof UrlToMarkdownProvider>

export const WebSearchSchema = z.object({
  perplexityApiKey: z.string().nullish(),
  country: z.string().nullish(),
  languages: z.array(z.string()).nullish(),
  urlToMarkdownProvider: UrlToMarkdownProvider.default('jina').nullish(),
  maxResults: z.number().gte(1).lte(50).nullish(),
  recencyFilter: z.enum(['hour', 'day', 'week', 'month', 'year']).nullish(),
  domainFilter: z.string().nullish() // comma-separated domain list
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

export const MemoryLayerSchema = z.object({
  // User memory: auto-write memories after conversations
  autoWrite: z.boolean().default(true),
  // LCM: enable lossless context management for long conversations
  lcmEnabled: z.boolean().default(true),
  // LCM: trigger compaction when context exceeds this % of the context window (50-95)
  contextWindowPercent: z.number().gte(50).lte(95).nullish(),
  // LCM: number of most recent messages protected from compaction (8-64)
  freshTailSize: z.number().gte(8).lte(64).nullish()
})

export const ColorTone = z.enum([
  'neutral',
  'emerald',
  'blue',
  'violet',
  'rose',
  'orange',
  'yellow'
])
export type ColorTone = z.infer<typeof ColorTone>

export const PersonalitySchema = z.object({
  // About you
  nickname: z.string().nullish(),
  occupation: z.string().nullish(),
  aboutYou: z.string().nullish(),
  // Personalization
  baseStyle: z
    .enum([
      'default',
      'professional',
      'friendly',
      'candid',
      'quirky',
      'efficient',
      'cynical'
    ])
    .default('default'),
  warm: z.enum(['default', 'more', 'less']).default('default'),
  enthusiastic: z.enum(['default', 'more', 'less']).default('default'),
  headersAndLists: z.enum(['default', 'more', 'less']).default('default'),
  emoji: z.enum(['default', 'more', 'less']).default('default'),
  customInstructions: z.string().nullish()
})

export const SettingsSchema = z.object({
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
  memoryLayer: MemoryLayerSchema.nullish(),
  personality: PersonalitySchema.nullish(),
  colorTone: ColorTone.default('neutral').nullish(),
  createdAt: z.any(),
  updatedAt: z.any()
})

export type Settings = z.infer<typeof SettingsSchema>

export type SettingsInput = z.input<typeof SettingsSchema>

export type UseFormReturnType = UseFormReturn<SettingsInput>
