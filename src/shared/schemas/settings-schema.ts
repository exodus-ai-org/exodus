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

// Stricter variant of `optionalUrl` that also requires an explicit http(s)
// scheme. `optionalUrl` accepts scheme-less values like `localhost:9200`, which
// the Elasticsearch client rejects at construction time ("Invalid protocol") —
// so that field has to be caught at save time instead. Deliberately NOT applied
// to the other provider URL fields, whose looser behavior is relied upon.
const optionalHttpUrl = optionalUrl.refine(
  (val) => val == null || val === '' || /^https?:\/\//.test(val),
  { message: 'Must start with http:// or https://' }
)

// HTML <input type="number"> emits string values via onChange, so RHF stores
// strings while the user is typing. Wrap numeric fields with this preprocess
// to coerce on validation: '' → undefined, '1.5' → 1.5, anything non-numeric
// passes through so ZodNumber can flag it. The cast keeps the inferred input
// type as `number` (matching the inner schema) so RHF's field types stay
// `number | null | undefined` for consumers like <Input value={...}>.
const formNumber = <T extends z.ZodNumber>(inner: T): T =>
  z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined
    if (typeof v === 'string') {
      const n = Number(v)
      return Number.isNaN(n) ? v : n
    }
    return v
  }, inner) as unknown as T

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

export const VoiceSchema = z.object({
  speechToTextModel: z.string().nullish(),
  textToSpeechVoice: z.string().nullish(),
  textToSpeechModel: z.string().nullish(),
  textToSpeechSpeed: formNumber(z.number().min(0.25).max(4.0)).nullish(),
  textToSpeechFormat: z.string().nullish(),
  textToSpeechInstructions: z.string().nullish()
})

export const GoogleCloudSchema = z.object({
  googleApiKey: z.string().nullish()
})

export const WebSearchSchema = z.object({
  braveApiKey: z.string().nullish(),
  country: z.string().nullish(),
  languages: z.array(z.string()).nullish(),
  maxResults: formNumber(z.number().gte(1).lte(50)).nullish(),
  recencyFilter: z.enum(['hour', 'day', 'week', 'month', 'year']).nullish(),
  domainFilter: z.string().nullish() // comma-separated domain list
})

export const ElasticsearchSchema = z.object({
  url: optionalHttpUrl,
  username: z.string().nullish(),
  password: z.string().nullish(),
  indexName: z.string().nullish() // defaults to 'exodus-messages' if unset
})

export const SearchSchema = z.object({
  elasticsearch: ElasticsearchSchema.nullish()
})

export const ImageSchema = z.object({
  model: z.string().nullish(),
  size: z.string().nullish(),
  quality: z.string().nullish(),
  outputFormat: z.string().nullish(),
  generatedCounts: formNumber(z.number().nonnegative().lte(10)).nullish(),
  background: z.string().nullish()
})

export const DeepResearchSchema = z.object({
  breadth: formNumber(z.number().gte(3).lte(10)).nullish(),
  depth: formNumber(z.number().gte(1).lte(5)).nullish()
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

export const MemorySchema = z.object({
  // User memory: consolidate durable facts into memory after conversations
  autoCapture: z.boolean().default(true),
  // User memory: surface relevant memory into the system prompt of new chats
  useInChat: z.boolean().default(true),
  // LCM: enable lossless context management for long conversations
  lcmEnabled: z.boolean().default(true),
  // LCM: trigger compaction when context exceeds this % of the context window (50-95)
  contextWindowPercent: formNumber(z.number().gte(50).lte(95)).nullish(),
  // LCM: number of most recent messages protected from compaction (8-64)
  freshTailSize: formNumber(z.number().gte(8).lte(64)).nullish()
})

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

export const KeyboardShortcutsSchema = z.object({
  // Ids of toggleable shortcuts (ShortcutDef.id in use-keyboard-shortcuts.ts)
  // the user has turned off. Absent/empty = everything enabled.
  disabled: z.array(z.string()).nullish()
})

export const SettingsSchema = z.object({
  id: z.string(),
  providerConfig: ProviderConfigSchema.nullish(),
  providers: ProvidersSchema.nullish(),
  mcpServers: z.string().nullish(),
  tools: ToolsSchema.nullish(),
  voice: VoiceSchema.nullish(),
  assistantAvatar: z.string().nullish(),
  googleCloud: GoogleCloudSchema.nullish(),
  webSearch: WebSearchSchema.nullish(),
  search: SearchSchema.nullish(),
  image: ImageSchema.nullish(),
  deepResearch: DeepResearchSchema.nullish(),
  s3: S3Schema.nullish(),
  autoUpdate: z.boolean().nullish(),
  runOnStartup: z.boolean().nullish(),
  menuBar: z.boolean().nullish(),
  autoBackup: z.boolean().nullish(),
  lastBackupAt: z.any().nullish(),
  memory: MemorySchema.nullish(),
  personality: PersonalitySchema.nullish(),
  keyboardShortcuts: KeyboardShortcutsSchema.nullish(),
  createdAt: z.any(),
  updatedAt: z.any()
})

export type Settings = z.infer<typeof SettingsSchema>

export type SettingsInput = z.input<typeof SettingsSchema>

export type UseFormReturnType = UseFormReturn<SettingsInput>
