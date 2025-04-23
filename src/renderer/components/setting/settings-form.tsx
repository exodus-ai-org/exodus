import { Form } from '@/components/ui/form'
import { useSetting } from '@/hooks/use-setting'
import { isMcpServerChangedAtom, settingsLabelAtom } from '@/stores/setting'
import { zodResolver } from '@hookform/resolvers/zod'
import { Providers } from '@shared/types/ai'
import { useAtomValue, useSetAtom } from 'jotai'
import { useForm, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AudioSpeech } from './settings-form/audio-speech'
import { AvatarUploader } from './settings-form/avatar-uploader'
import { DataControls } from './settings-form/data-controls'
import { FileUploadEndpoint } from './settings-form/file-upload-endpoint'
import { GoogleMaps } from './settings-form/google-maps'
import { MCP } from './settings-form/mcp'
import { ProviderConfig } from './settings-form/provider-config'
import { AnthropicClaude } from './settings-form/providers/anthropic-claude'
import { AzureOpenAi } from './settings-form/providers/azure-openai'
import { GoogleGemini } from './settings-form/providers/google-gemini'
import { Ollama } from './settings-form/providers/ollama'
import { OpenAiGpt } from './settings-form/providers/openai-gpt'
import { WebSearch } from './settings-form/web-search'
import { UnderConstruction } from './under-construction'

const formSchema = z.object({
  provider: z.string().nullable(),
  chatModel: z.string().nullable(),
  reasoningModel: z.string().nullable(),
  openaiApiKey: z.string().nullable(),
  openaiBaseUrl: z.union([z.string().url().nullable(), z.literal('')]),
  azureOpenaiApiKey: z.string().nullable(),
  azureOpenAiEndpoint: z.union([z.string().url().nullable(), z.literal('')]),
  azureOpenAiApiVersion: z.string().nullable(),
  anthropicApiKey: z.string().nullable(),
  anthropicBaseUrl: z.union([z.string().url().nullable(), z.literal('')]),
  googleGeminiApiKey: z.string().nullable(),
  googleGeminiBaseUrl: z.union([z.string().url().nullable(), z.literal('')]),
  xAiApiKey: z.string().nullable(),
  xAiBaseUrl: z.union([z.string().url().nullable(), z.literal('')]),
  ollamaBaseUrl: z.string().nullable(),
  mcpServers: z.string().nullable(),
  speechToTextModel: z.string().nullable(),
  textToSpeechVoice: z.string().nullable(),
  textToSpeechModel: z.string().nullable(),
  fileUploadEndpoint: z.string().nullable(),
  assistantAvatar: z.string().nullable(),
  googleApiKey: z.string().nullable(),
  serperApiKey: z.string().nullable(),
  maxSteps: z.coerce.number().nonnegative().lte(20).nullable()
})

export type UseFormReturnType = UseFormReturn<z.infer<typeof formSchema>>

export function SettingsForm() {
  const setIsMcpServerChanged = useSetAtom(isMcpServerChangedAtom)
  const { data: settings, mutate, updateSetting } = useSetting()
  const activeTitle = useAtomValue(settingsLabelAtom)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: settings,
    mode: 'onBlur'
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!settings) return

    if (form.formState.isDirty) {
      if (form.formState.dirtyFields.mcpServers) {
        setIsMcpServerChanged(true)
      }

      updateSetting({ id: settings.id, ...values })
      mutate()
      toast.success('Auto saved.')
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-1 flex-col gap-4"
        onBlur={form.handleSubmit(onSubmit)}
      >
        {activeTitle === 'Providers' && <ProviderConfig form={form} />}

        {activeTitle === Providers.OpenAiGpt && <OpenAiGpt form={form} />}

        {activeTitle === Providers.AzureOpenAi && <AzureOpenAi form={form} />}

        {activeTitle === Providers.AnthropicClaude && (
          <AnthropicClaude form={form} />
        )}

        {activeTitle === Providers.GoogleGemini && <GoogleGemini form={form} />}

        {activeTitle === Providers.XaiGrok && <GoogleGemini form={form} />}

        {activeTitle === Providers.Ollama && <Ollama form={form} />}

        {activeTitle === 'File Upload Endpoint' && (
          <FileUploadEndpoint form={form} />
        )}

        {activeTitle === 'Assistant Avatar' && (
          <AvatarUploader
            props={{ control: form.control, name: 'assistantAvatar' }}
          />
        )}

        {activeTitle === 'MCP Servers' && <MCP form={form} />}

        {activeTitle === 'Audio and Speech' && <AudioSpeech form={form} />}

        {activeTitle === 'Google Maps' && <GoogleMaps form={form} />}

        {activeTitle === 'Web Search' && <WebSearch form={form} />}

        {activeTitle === 'Deep Research' && <UnderConstruction />}

        {activeTitle === 'RAG' && <UnderConstruction />}

        {activeTitle === 'Artifacts' && <UnderConstruction />}

        {activeTitle === 'Browser Use' && <UnderConstruction />}

        {activeTitle === 'Computer Use' && <UnderConstruction />}

        {activeTitle === 'Data Controls' && <DataControls />}

        {activeTitle === 'Software Update' && <UnderConstruction />}

        {activeTitle === 'About Exodus' && <UnderConstruction />}
      </form>
    </Form>
  )
}
